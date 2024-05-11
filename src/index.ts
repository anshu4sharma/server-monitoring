import express, { Request, Response } from "express";
import client from "prom-client";
import responseTime from "response-time";
const collectDefaultMetrics = client.collectDefaultMetrics;
const register = client.register;

collectDefaultMetrics({ register:register });

// Collect Api Response Time
const reqTime = new client.Histogram({
  name: "req_res_time",
  help: "This tells how much time tooks in req and res",
  labelNames: ["method", "route", "status_code"],
  buckets: [1, 100, 200, 400, 500, 700, 900, 1100, 1400, 1600, 2000],
});

const totalReqCounter = new client.Counter({
  name:"total_req",
  help:"it will display all no. of requests"
})

async function init() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8000;

  // Middleware to detect response and request time
  app.use(
    responseTime((req: Request, res: Response, time: number) => {
      totalReqCounter.inc()
      reqTime
        .labels({
          method: req.method,
          route: req.url,
          status_code: res.statusCode,
        })
        .observe(time);
    })
  );
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({ message: "Server is up and running" });
  });

  app.get("/metrics", async (req, res) => {
    res.setHeader("Content-Type", client.register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  });

  app.get("/slow", async (req, res) => {
    await new Promise((res) => setTimeout(() => res(null), 2000));
    res.json({ message: "Server is up and running" });
  });

  app.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));
}

init();
