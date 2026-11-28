import { DomainError } from '../../../shared/errors/domain-error';

export class InvalidMobileBuildError extends DomainError {
  constructor(reason: string) {
    super('MOBILE_BUILD_INVALID', `No se puede lanzar el build: ${reason}.`, {
      reason,
    });
  }
}

export class MobileBuildNotFoundError extends DomainError {
  constructor(id: number) {
    super('MOBILE_BUILD_NOT_FOUND', `No existe el build ${id}.`, { id });
  }
}

export class MobileBuildsNotConfiguredError extends DomainError {
  constructor() {
    super(
      'MOBILE_BUILDS_NOT_CONFIGURED',
      'Los builds no están configurados en la API (falta GITHUB_BUILDS_TOKEN).',
    );
  }
}

export class MobileBuildsGithubError extends DomainError {
  constructor(what: string, status: number) {
    super(
      'MOBILE_BUILDS_GITHUB_FAILED',
      `GitHub no respondió bien al ${what} (${status}).`,
      { what, status },
    );
  }
}
