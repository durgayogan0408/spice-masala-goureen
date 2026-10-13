export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(error, req, res, _next) {
  console.error(error);
  if (error.name === "ZodError") {
    return res.status(400).json({ message: "Please check the submitted information.", errors: error.issues });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "The submitted identifier is invalid." });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists." });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  return res.status(status).json({ message: status < 500 ? error.message : "Something went wrong. Please try again." });
}
