import { MongoClient } from "mongodb";
import express from "express";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(express.json());
const PORT=process.env.PORT;

// const MONGO_URL = "mongodb://127.0.0.1";
const MONGO_URL = process.env.MONGO_URL;

async function createConnection() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("Mongo DB connected ✌😊");
  return client;
}

const client = await createConnection();

app.listen(PORT,()=>console.log(`APP is running ${PORT}`));

//welcome message
app.get("/", (req, res) => {
  res.send("Welcome to assign mentor to the students app");
});

//1.Write API to create Student
app.post("/createStudent", async function(req, res){
  const {studentName}=req.body;
  const data= {
    "studentName":studentName,
    "mentor_ID": "",
    "mentor_name": "",
    "mentor_assigned":false
  };
  const result = await client.db("AssignMentor").collection("Students").insertOne(data)
  res.send(result);
});

//2.Write API to create Mentor
app.post("/createMentor", async function(req, res){ 
  const {mentorName}=req.body;
  const data= {
    "mentorName":mentorName,
    "student_ID": [],
    "student_assigned":false
  };
  const result = await client.db("AssignMentor").collection("Mentors").insertOne(data)
  res.send(result);
});

//3. Write API to Assign a student to Mentor
// Select a mentor and Add multiple Student 

app.put("/assignMentor", async function(req, res){ 
  const {mentorName,students}=req.body;
  const mentorFromDB=await client.db("AssignMentor").collection("Mentors").findOne({"mentorName":mentorName});
  const studentlist=[];
  let initialMenteelength=0;
  if(mentorFromDB.student_assigned===true){
    initialMenteelength=mentorFromDB.student_ID.length;
    mentorFromDB.student_ID.map((stud_id)=>studentlist.push(stud_id));
  }
  for(let i=0;i<students.length;i++){
    const studentName=students[i];
    const studentFromDB=await client.db("AssignMentor").collection("Students").findOne({"studentName":studentName});
    if(studentFromDB.mentor_assigned===false){
      const result1=await client.db("AssignMentor").collection("Students").updateOne({"studentName":studentName},
      {$set:{"mentor_ID":mentorFromDB._id,"mentor_name":mentorFromDB.mentorName,"mentor_assigned":true}})
      studentlist.push(studentFromDB._id);
    }
  }
  if((studentlist.length-initialMenteelength)>0){
  const result2=await client.db("AssignMentor").collection("Mentors").updateOne({"mentorName":mentorName},
      {$set:{"student_ID":studentlist,"student_assigned":true}})
  res.send(` Students are added to mentor `);}
  else {
    res.send(`students already have mentor`)
  }
  });

// 4. Write API to Assign or Change Mentor for particular Student
// Select a Student and Assign a Mentor

app.put("/changeMentor", async function(req, res){ 
    const {studentName,mentorName}=req.body;
    const mentorFromDB=await client.db("AssignMentor").collection("Mentors").findOne({"mentorName":mentorName});
    const studentFromDB=await client.db("AssignMentor").collection("Students").findOne({"studentName":studentName});
    let sameMentorCheck=mentorFromDB.student_ID.filter(function(std_id)
    {
      if(String(std_id)===String(studentFromDB._id))
        return std_id;
      })
    if(sameMentorCheck.length>0){
      res.send(`student already assigned to same  Mentor`);
    }else{
    let flag=0;
    if(studentFromDB.mentor_assigned===true) {
      let oldMentorStudentList=[];
      const oldMentorFromDB = await client.db("AssignMentor").collection("Mentors").findOne({"mentorName":studentFromDB.mentor_name});
          if(oldMentorFromDB.student_ID.length>1){
            oldMentorStudentList=oldMentorFromDB.student_ID;
            oldMentorStudentList=oldMentorStudentList.filter(function (std_ID){
              if(String(std_ID)!=String(studentFromDB._id))
                return std_ID;
            })
            const result2=await client.db("AssignMentor").collection("Mentors").updateOne({"mentorName":oldMentorFromDB.mentorName},
            {$set:{"student_ID":oldMentorStudentList}})
          }else{ 
            const result2=await client.db("AssignMentor").collection("Mentors").updateOne({"mentorName":oldMentorFromDB.mentorName},
            {$set:{"student_ID":[],"student_assigned":false}})
          }         
          flag=1;
   }
    const studentlist=[];
    if(mentorFromDB.student_assigned===true){
      mentorFromDB.student_ID.map((stud_id)=>studentlist.push(stud_id));}
     studentlist.push(studentFromDB._id);
    const result=await client.db("AssignMentor").collection("Mentors").updateOne({"mentorName":mentorName},
    {$set:{"student_ID":studentlist,"student_assigned":true}})

    const result3=await client.db("AssignMentor").collection("Students").updateOne({"studentName":studentName},
    {$set:{"mentor_ID":mentorFromDB._id,"mentor_name":mentorFromDB.mentorName,"mentor_assigned":true}})

    if(flag===1){
        res.send(` Mentor changed for student`);
      }else{
          res.send(` Mentor assigned for student`);
          }
      }
    }
    );

//5.Write API to show all students for a particular mentor

app.get('/getAllStudentsOf/:mentorName',async function (request, response) {
      const {mentorName}=request.params;
      const mentorFromDB=await client.db("AssignMentor").collection("Mentors").findOne({"mentorName":mentorName});
      const studentsList=mentorFromDB.student_ID;
      if(studentsList.length>0){
          let studentsName=[];
          for(let i=0;i<studentsList.length;i++) {
            const studentFromDB=await client.db("AssignMentor").collection("Students").findOne({"_id":ObjectId(studentsList[i])});
            studentsName.push(studentFromDB.studentName)
          }
          studentsName=studentsName.join(",");
          response.send(`students of ${mentorName} are ${studentsName}`);
      }else{
        response.send(`No student is assign to ${mentorName}`);
      }
})



