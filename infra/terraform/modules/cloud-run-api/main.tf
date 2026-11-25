# API (NestJS) en Cloud Run: lo mismo que montaban a mano deploy.sh y
# setup-github-deploy.sh, ahora declarado. Reparto de responsabilidades:
#   - Terraform: configuración (CPU/memoria, escalado, variables, secretos,
#     cuentas de servicio, permisos, Workload Identity Federation).
#   - deploy.sh (GitHub Actions): construye la imagen, migra y cambia SOLO la
#     imagen del servicio y del job. Por eso Terraform ignora `image`.

data "google_project" "this" {
  project_id = var.project
}

locals {
  runtime_sa_id = var.service_name
  env_volume    = "env-file"
}

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
  ])

  project            = var.project
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "images" {
  project       = var.project
  location      = var.region
  repository_id = var.artifact_repository
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "runtime" {
  project      = var.project
  account_id   = local.runtime_sa_id
  display_name = "Brío API (Cloud Run)"
}

# --- Secretos -----------------------------------------------------------------

# El .env completo (BBDD, JWT, R2, OpenAI…). Terraform no guarda sus valores:
# se suben con `deploy.sh secrets`.
resource "google_secret_manager_secret" "env" {
  project   = var.project
  secret_id = var.env_secret_name

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_iam_member" "env_runtime" {
  project   = var.project
  secret_id = google_secret_manager_secret.env.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

# Secretos generados por Terraform (p. ej. el compartido con el Worker).
resource "google_secret_manager_secret" "generated" {
  for_each = toset(var.secret_env_var_names)

  project   = var.project
  secret_id = "${var.service_name}-${lower(replace(each.key, "_", "-"))}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "generated" {
  for_each = toset(var.secret_env_var_names)

  secret      = google_secret_manager_secret.generated[each.key].id
  secret_data = var.secret_env_vars[each.key]
}

resource "google_secret_manager_secret_iam_member" "generated_runtime" {
  for_each = toset(var.secret_env_var_names)

  project   = var.project
  secret_id = google_secret_manager_secret.generated[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

# --- Servicio -------------------------------------------------------------------

resource "google_cloud_run_v2_service" "api" {
  project             = var.project
  location            = var.region
  name                = var.service_name
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = true

  template {
    service_account                  = google_service_account.runtime.email
    timeout                          = var.request_timeout
    max_instance_request_concurrency = var.concurrency

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    volumes {
      name = local.env_volume
      secret {
        secret = google_secret_manager_secret.env.secret_id
        items {
          version = "latest"
          path    = ".env"
        }
      }
    }

    containers {
      image = var.bootstrap_image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      volume_mounts {
        name       = local.env_volume
        mount_path = "/secrets"
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = toset(var.secret_env_var_names)
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.generated[env.value].secret_id
              version = google_secret_manager_secret_version.generated[env.value].version
            }
          }
        }
      }
    }
  }

  lifecycle {
    # La imagen la despliega deploy.sh en cada push; gcloud además marca el
    # cliente que hizo el cambio.
    ignore_changes = [
      template[0].containers[0].image,
      template[0].revision,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.env_runtime,
    google_secret_manager_secret_iam_member.generated_runtime,
  ]
}

# API pública (la autenticación la hace la propia API).
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- Job de migraciones (prisma migrate deploy) -------------------------------

resource "google_cloud_run_v2_job" "migrate" {
  project             = var.project
  location            = var.region
  name                = "${var.service_name}-migrate"
  deletion_protection = true

  template {
    template {
      service_account = google_service_account.runtime.email
      max_retries     = 0
      timeout         = "600s"

      volumes {
        name = local.env_volume
        secret {
          secret = google_secret_manager_secret.env.secret_id
          items {
            version = "latest"
            path    = ".env"
          }
        }
      }

      containers {
        image = var.bootstrap_image

        volume_mounts {
          name       = local.env_volume
          mount_path = "/secrets"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.env_runtime,
  ]
}

# --- Despliegue desde GitHub Actions (Workload Identity Federation) ------------

locals {
  gh           = var.github_deploy
  deployer_sa  = "github-deploy"
  build_sa     = "${data.google_project.this.number}-compute@developer.gserviceaccount.com"
  deployer_set = local.gh == null ? toset([]) : toset(["this"])
}

resource "google_service_account" "deployer" {
  for_each = local.deployer_set

  project      = var.project
  account_id   = local.deployer_sa
  display_name = "Despliegue desde GitHub Actions"
}

# Lo justo para subir el código a Cloud Build y seguir el log, actualizar el
# servicio y el job de migraciones, y hacerlos correr como la SA de runtime.
resource "google_project_iam_member" "deployer" {
  for_each = local.gh == null ? toset([]) : toset([
    "roles/run.admin",
    "roles/cloudbuild.builds.editor",
    "roles/logging.viewer",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  project = var.project
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer["this"].email}"
}

resource "google_storage_bucket_iam_member" "deployer_cloudbuild" {
  for_each = local.deployer_set

  bucket = "${var.project}_cloudbuild"
  role   = "roles/storage.admin"
  member = "serviceAccount:${google_service_account.deployer["this"].email}"
}

resource "google_service_account_iam_member" "deployer_act_as_runtime" {
  for_each = local.deployer_set

  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer["this"].email}"
}

resource "google_service_account_iam_member" "deployer_act_as_build" {
  for_each = local.deployer_set

  service_account_id = "projects/${var.project}/serviceAccounts/${local.build_sa}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer["this"].email}"
}

resource "google_iam_workload_identity_pool" "github" {
  for_each = local.deployer_set

  project                   = var.project
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  for_each = local.deployer_set

  project                            = var.project
  workload_identity_pool_id          = google_iam_workload_identity_pool.github["this"].workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
  # Solo este repo y solo la rama del proyecto.
  attribute_condition = "assertion.repository=='${local.gh.repository}' && assertion.ref=='refs/heads/${local.gh.branch}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "deployer_wif" {
  for_each = local.deployer_set

  service_account_id = google_service_account.deployer["this"].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github["this"].name}/attribute.repository/${local.gh.repository}"
}
