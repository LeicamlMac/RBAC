class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(msg, details) { return new AppError(msg, 400, details); }
  static unauthorized(msg = 'Não autenticado') { return new AppError(msg, 401); }
  static forbidden(msg = 'Acesso negado para o seu perfil') { return new AppError(msg, 403); }
  static notFound(msg = 'Recurso não encontrado') { return new AppError(msg, 404); }
  static conflict(msg) { return new AppError(msg, 409); }
}

module.exports = AppError;
