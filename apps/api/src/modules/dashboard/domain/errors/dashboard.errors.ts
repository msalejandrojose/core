export class DashboardNotFoundError extends Error {
  constructor(id: string) {
    super(`Dashboard '${id}' not found`);
    this.name = 'DashboardNotFoundError';
  }
}

export class DashboardForbiddenError extends Error {
  constructor() {
    super('You do not have access to this dashboard');
    this.name = 'DashboardForbiddenError';
  }
}

export class CannotDeleteLastDashboardError extends Error {
  constructor() {
    super('Cannot delete the only remaining dashboard');
    this.name = 'CannotDeleteLastDashboardError';
  }
}
