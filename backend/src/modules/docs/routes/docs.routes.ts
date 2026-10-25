import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "../openapi";

export const docsRoutes = Router();

docsRoutes.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});
docsRoutes.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, { customSiteTitle: "BookLeaf API Docs" }),
);
