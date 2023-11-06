const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// mongo db codes start

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_Pass}@cluster0.htztern.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // My code here starts

    //database collections
    const assignmentCollection = client
      .db("assignmentDb")
      .collection("allassignment");

    // get related api
    // all assignment
    app.get("/allAssignment", async (req, res) => {
      console.log(req.query.status);
      if (req.query.status === "All") {
        const result = await assignmentCollection.find().toArray();
        res.send(result);
      }

      if (req.query.status !== "All") {
        const query = { difficulty: req.query.status };
        const result = await assignmentCollection.find(query).toArray();
        res.send(result);
      }
    });
    // get spesific user data
    app.get("/allAssignment/user", async (req, res) => {
      // const query = req.query;
      let query = {};
      if (req.query.email) {
        query = { createdBy: req.query.email };
      }
      const result = await assignmentCollection.find(query).toArray();
      console.log(query);
      res.send(result);
    });

    // assignmet related post apis
    app.post("/addAssignment", async (req, res) => {
      const assignment = req.body;
      // console.log(assignment);
      const result = await assignmentCollection.insertOne(assignment);
      res.json(result);
    });

    // My code here ends

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// mongo db codes end
app.get("/", (req, res) => {
  res.send("Assignmet Buddy Server is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
