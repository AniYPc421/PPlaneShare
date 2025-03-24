import express from "express";

const router = express.Router();

router.use(express.static("public"));
router.get("/", (req, res) => {
  res.redirect("/index.html");
});

router.use((req, res) => {
  res.status(404);
  res.send("not found");
});

export default router;
