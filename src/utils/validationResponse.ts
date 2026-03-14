import { Response } from "express";

export type FieldValidationError = {
  field: string;
  message: string;
};

export const DEFAULT_VALIDATION_MESSAGE =
  "Please correct the highlighted fields and try again.";

export const sendValidationError = (
  res: Response,
  errors: FieldValidationError[],
  statusCode = 400,
  message = DEFAULT_VALIDATION_MESSAGE
) =>
  res.status(statusCode).json({
    status: "error",
    message,
    errors,
  });

export const sendSingleFieldValidationError = (
  res: Response,
  field: string,
  errorMessage: string,
  statusCode = 400,
  message = DEFAULT_VALIDATION_MESSAGE
) =>
  sendValidationError(
    res,
    [
      {
        field,
        message: errorMessage,
      },
    ],
    statusCode,
    message
  );
