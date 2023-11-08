const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

const accessToken = process.env.ACCESS_TOKEN_SECRET;
// console.log(accessToken);
// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      // "http://localhost:4173",
      "https://assignment-buddy.surge.sh",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// create custom middleware to check the jwt token

const veryfyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log(token);
  // console.log("token in middleware", token);
  if (!token) {
    return res.status(401).send({ message: "no token access" });
  }
  jwt.verify(token, accessToken, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ message: "verrify secton error block access" });
    }
    req.user = decoded;
    console.log("request.user", req.user);
    next();
  });
};

// app.use(veryfyToken)
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

// // verify token

// const verifyToken = (req, res, next) => {
//   const token = req?.cookies?.token;
//   // console.log('token in the middleware', token);
//   // no token available
//   if (!token) {
//     return res.status(401).send({ message: "unauthorized access" });
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ message: "unauthorized access" });
//     }
//     req.user = decoded;
//     next();
//   });
// };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // My code here starts

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(req.body);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // logout api
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { maxAge: 0, secure: true, sameSite: "none" })
        .send({ logout: true });
    });

    //database collections
    const assignmentCollection = client
      .db("assignmentDb")
      .collection("allassignment");
    const submiteedAssignmentCollection = client
      .db("assignmentDb")
      .collection("submittedAssignment");

    // get related api
    //  assignment based on dificulty query
    app.get("/allAssignment", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      // console.log(page, size);
      if (req.query.status === "All") {
        const result = await assignmentCollection
          .find()
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      }

      if (req.query.status !== "All") {
        query = { dificulty: req.query.status };
        console.log(query);
        const result = await assignmentCollection
          .find(query)
          .skip(page * size)
          .limit(size)
          .toArray();
        res.send(result);
      }
    });
    // get spesific user data using email
    app.get("/allAssignment/user", async (req, res) => {
      // const query = req.query;
      let query = {};
      if (req.query.email) {
        query = { createdBy: req.query.email };
      }
      const result = await assignmentCollection.find(query).toArray();
      // console.log(query);
      res.send(result);
    });

    // get single assignment data

    app.get("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.findOne(query);
      res.send(result);
      // console.log(id);
    });

    // get signle submitted assignment data
    app.get("/assignment/submitted/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await submiteedAssignmentCollection.findOne(query);
      res.send(result);
    });

    // get all submitted assignment

    app.get("/submittedAssignment", veryfyToken, async (req, res) => {
      let query = {};
      // console.log(req.query.email);
      if (req.query.email) {
        query = { submittedBy: req.query.email };
        // console.log("query form submitted ass", query);
        // submittedBy
      }
      const result = await submiteedAssignmentCollection.find(query).toArray();
      res.send(result);
    });

    // get assignment count
    app.get("/assignment-count", async (req, res) => {
      const assignmentCount =
        await assignmentCollection.estimatedDocumentCount();
      res.send({ assignmentCount });
    });

    // assignmet related post apis

    // all assignment post
    app.post("/addAssignment", veryfyToken, async (req, res) => {
      const assignment = req.body;
      // console.log(assignment);
      const result = await assignmentCollection.insertOne(assignment);
      res.json(result);
    });




    // submitted assignment post
    app.post("/submittedAssignment", veryfyToken, async (req, res) => {
      const submission = req.body;
      // console.log(submission);
      const result = await submiteedAssignmentCollection.insertOne(submission);
      res.send(result);
    });

    // put methods
    app.put("/addAssignment/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedAssignmentData = req.body;
      const updateAssignment = {
        $set: {
          assignmentTitle: updatedAssignmentData.assignmentTitle,
          thumbnailUrl: updatedAssignmentData.thumbnailUrl,
          dueDate: updatedAssignmentData.dueDate,
          dificulty: updatedAssignmentData.dificulty,
          mark: updatedAssignmentData.mark,
          description: updatedAssignmentData.description,
          createdBy: updatedAssignmentData.createdBy,
        },
      };
      // console.log(updatedAssignmentData);
      const result = await assignmentCollection.updateOne(
        filter,
        updateAssignment,
        options
      );
      res.send(result);
    });

    // pathc methods
    app.patch("/markAssignment/:id", veryfyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const markData = req.body;
      const updateData = {
        $set: {
          givenMark: markData.givenMark,
          feedback: markData.feedback,
          status: markData.status,
        },
      };
      const result = await submiteedAssignmentCollection.updateOne(
        filter,
        updateData
      );
      res.send(result);
    });

    // delleate methods
    app.delete("/deleteAssignment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/deleteMysubmission/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await submiteedAssignmentCollection.deleteOne(query);
      res.send(result);
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
