import { StatusCodes } from "http-status-codes";
import { ErrorCode } from "./ErrorCode.js";

export class AppError {
  msg: string;
  errCode?: ErrorCode;
  statusCode: StatusCodes;
  root?: Error;

  constructor(
    msg: string,
    statusCode: StatusCodes,
    errCode?: ErrorCode,
    root?: Error
  ) {
    this.msg = msg;
    this.errCode = errCode;
    this.statusCode = statusCode;
    this.root = root;
  }

  static newError(
    errCode: ErrorCode,
    httpCode: StatusCodes,
    msg: string
  ): AppError {
    return new AppError(msg, httpCode, errCode);
  }

  static newError400(errCode: ErrorCode, msg: string): AppError {
    return new AppError(msg, StatusCodes.BAD_REQUEST, errCode);
  }

  static newError401(errCode: ErrorCode, msg: string): AppError {
    return new AppError(msg, StatusCodes.UNAUTHORIZED, errCode);
  }

  static newError403(errCode: ErrorCode, msg: string): AppError {
    return new AppError(msg, StatusCodes.FORBIDDEN, errCode);
  }

  static newError404(errCode: ErrorCode, msg: string): AppError {
    return new AppError(msg, StatusCodes.NOT_FOUND, errCode);
  }

  static newError500(errCode: ErrorCode, msg: string): AppError {
    return new AppError(msg, StatusCodes.INTERNAL_SERVER_ERROR, errCode);
  }

  static newError502(errCode: ErrorCode, msg: string): AppError {
    return new AppError(msg, StatusCodes.BAD_GATEWAY, errCode);
  }

  static newError429(errCode: ErrorCode, msg: string): AppError {
    return new AppError(msg, StatusCodes.TOO_MANY_REQUESTS, errCode);
  }

  static newRootError400(
    errCode: ErrorCode,
    msg: string,
    root: Error
  ): AppError {
    return new AppError(msg, StatusCodes.BAD_REQUEST, errCode, root);
  }

  static newRootError401(
    errCode: ErrorCode,
    msg: string,
    root: Error
  ): AppError {
    return new AppError(msg, StatusCodes.UNAUTHORIZED, errCode, root);
  }

  static newRootError403(
    errCode: ErrorCode,
    msg: string,
    root: Error
  ): AppError {
    return new AppError(msg, StatusCodes.FORBIDDEN, errCode, root);
  }

  static newRootError404(
    errCode: ErrorCode,
    msg: string,
    root: Error
  ): AppError {
    return new AppError(msg, StatusCodes.NOT_FOUND, errCode, root);
  }

  static newRootError500(
    errCode: ErrorCode,
    msg: string,
    root: Error
  ): AppError {
    return new AppError(msg, StatusCodes.INTERNAL_SERVER_ERROR, errCode, root);
  }

  static newRootError502(
    errCode: ErrorCode,
    msg: string,
    root: Error
  ): AppError {
    return new AppError(msg, StatusCodes.BAD_GATEWAY, errCode, root);
  }

  // Authentication specific methods
  static unauthorized(msg: string): AppError {
    return new AppError(msg, StatusCodes.UNAUTHORIZED);
  }

  static forbidden(msg: string): AppError {
    return new AppError(msg, StatusCodes.FORBIDDEN);
  }

  static badRequest(msg: string): AppError {
    return new AppError(msg, StatusCodes.BAD_REQUEST);
  }

  static notFound(msg: string): AppError {
    return new AppError(msg, StatusCodes.NOT_FOUND);
  }

  static rateLimited(msg: string): AppError {
    return new AppError(msg, StatusCodes.TOO_MANY_REQUESTS);
  }

  static internalError(msg: string): AppError {
    return new AppError(msg, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  static paymentRequired(msg: string): AppError {
    return new AppError(msg, StatusCodes.PAYMENT_REQUIRED);
  }
}