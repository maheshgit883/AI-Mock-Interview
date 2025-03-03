"use client";
import { db } from "@/utils/db";
import { MockInterview } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import { desc, eq } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import InterviewItemCard from "./InterviewItemCard";

const InterviewList = () => {
  const { user } = useUser();
  const [interviewList, setInterviewList] = useState([]);

  useEffect(() => {
    if (user) {
      getInterviewList();
    }
  }, [user]);

  const getInterviewList = async () => {
    try {
      const result = await db
        .select()
        .from(MockInterview)
        .where(eq(MockInterview.createdBy, user?.primaryEmailAddress?.emailAddress))
        .orderBy(desc(MockInterview.id));

      setInterviewList(result);
    } catch (error) {
      console.error("Failed to fetch interview list:", error);
    }
  };

  const handleDeleteInterview = async (mockId) => {
    try {
      await db.delete(MockInterview).where(eq(MockInterview.mockId, mockId));
      setInterviewList((prevList) => prevList.filter((interview) => interview.mockId !== mockId));
    } catch (error) {
      console.error("Error deleting interview:", error);
    }
  };

  return (
    <div>
      <h2 className="font-medium text-xl">Previous Mock Interviews</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-3">
        {interviewList.map((interview) => (
          <InterviewItemCard key={interview.id} interview={interview} onDeleteInterview={handleDeleteInterview} />
        ))}
      </div>
    </div>
  );
};

export default InterviewList;
