variable "project" {
  description = "ID del proyecto de GCP."
  type        = string
}

variable "region" {
  description = "Región de Cloud Run y Artifact Registry."
  type        = string
}

variable "service_name" {
  description = "Nombre del servicio de Cloud Run (también de la cuenta de servicio de runtime)."
  type        = string
}

variable "artifact_repository" {
  description = "Repositorio Docker de Artifact Registry."
  type        = string
}

variable "env_secret_name" {
  description = "Secreto de Secret Manager con el .env que se monta en /secrets/.env. Terraform crea el contenedor; las versiones (los valores) se suben con deploy.sh secrets."
  type        = string
}

variable "env_vars" {
  description = "Variables de entorno NO secretas (cloudrun.env.yaml)."
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Variables de entorno que salen de secretos gestionados aquí: nombre de la variable => valor. Cada una se guarda en su propio secreto."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "secret_env_var_names" {
  description = "Nombres (no sensibles) de las claves de secret_env_vars, para poder iterar."
  type        = list(string)
  default     = []
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 1
}

variable "concurrency" {
  type    = number
  default = 40
}

variable "request_timeout" {
  type    = string
  default = "120s"
}

variable "bootstrap_image" {
  description = "Imagen solo para crear el servicio/job la primera vez. Después la cambia deploy.sh (Terraform ignora la imagen)."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "github_deploy" {
  description = "Despliegue sin claves desde GitHub Actions (Workload Identity Federation). null = no gestionar."
  type = object({
    repository = string # owner/repo
    branch     = string
  })
  default = null
}
