"use client";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState, useRef } from "react";
import { Mic, StopCircle, Loader2, Camera, CameraOff } from "lucide-react";
import { toast } from "sonner";
import { chatSession } from "@/utils/GeminiAIModal";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import Webcam from "react-webcam";
import Image from "next/image";

const RecordAnswerSection = ({ 
  mockInterviewQuestion, 
  activeQuestionIndex, 
  interviewData, 
  onAnswerSave,
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const recognitionRef = useRef(null);
  const webcamRef = useRef(null);
  const mediaStreamRef = useRef(null); // Store media stream for cleanup

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }

        if (finalTranscript.trim()) {
          setUserAnswer((prev) => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognition.onerror = (event) => {
        toast.error(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
        recognitionRef.current?.stop();
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  // Enable webcam
  const EnableWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      mediaStreamRef.current = stream; // Store stream reference
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        webcamRef.current.onloadedmetadata = () => {
          webcamRef.current.play(); // Ensure video starts playing
        };
      }
      setWebcamEnabled(true);
      toast.success("Webcam enabled successfully");
    } catch (error) {
      toast.error("Failed to enable webcam", {
        description: "Please check your camera permissions"
      });
      console.error("Webcam error:", error);
    }
  };

  // Disable webcam
  const DisableWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop()); // Stop all tracks
      mediaStreamRef.current = null; // Clear reference
    }
    if (webcamRef.current) {
      webcamRef.current.srcObject = null; // Clear video element
    }
    setWebcamEnabled(false);
  };

  // Start/Stop Recording
  const StartStopRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech-to-text not supported");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      toast.info("Recording stopped");
    } else {
      setUserAnswer(""); // Reset answer before recording
      recognitionRef.current.start();
      toast.info("Recording started");
    }
    setIsRecording(!isRecording);
  };

  // Update User Answer
  const UpdateUserAnswer = async () => {
    if (!userAnswer.trim()) {
      toast.error("Please provide an answer");
      return;
    }

    setLoading(true);

    try {
      const feedbackPrompt = `Question: ${mockInterviewQuestion[activeQuestionIndex]?.question}, User Answer: ${userAnswer}. Please give a rating out of 10 and feedback on improvement in JSON format { "rating": <number>, "feedback": <text> }`;
      
      const result = await chatSession.sendMessage(feedbackPrompt);
      const responseText = result.response.text().replace(/```json|```/g, '').trim();

      let JsonfeedbackResp;
      try {
        JsonfeedbackResp = JSON.parse(responseText);
      } catch (jsonError) {
        toast.error("Failed to parse feedback response");
        console.error("JSON parsing error:", jsonError);
        return;
      }

      if (!JsonfeedbackResp.rating || !JsonfeedbackResp.feedback) {
        toast.error("Invalid feedback response format");
        return;
      }

      const answerRecord = {
        mockIdRef: interviewData?.mockId,
        question: mockInterviewQuestion[activeQuestionIndex]?.question,
        correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
        userAns: userAnswer,
        feedback: JsonfeedbackResp.feedback,
        rating: JsonfeedbackResp.rating,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: new Date().toLocaleDateString("en-GB"),
      };

      await db.insert(UserAnswer).values(answerRecord);
      onAnswerSave?.(answerRecord);
      toast.success("Answer recorded successfully");

      setUserAnswer(""); // Clear answer after saving
      setIsRecording(false);
    } catch (error) {
      toast.error("Failed to save answer", {
        description: error.message
      });
      console.error("Answer save error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center flex-col relative">
      {loading && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex flex-col justify-center items-center">
          <Loader2 className="h-16 w-16 animate-spin text-white mb-4" />
          <p className="text-white text-lg">Saving your answer...</p>
        </div>
      )}
         <div className="flex flex-col justify-center items-center rounded-lg p-5 mt-20 bg-black">
          <Image
            src="/webcam3.png"
            alt="WebCAM"
            width={140}
            height={140}
            className="absolute"
          />
          <Webcam
            mirrored={true}
            style={{
              height: 300,
              width: "100%",
              zIndex: 100,
            }}
          />
      </div>

      <Button
        variant="outline"
        className="my-10"
        onClick={StartStopRecording}
      >
        {isRecording ? (
          <h2 className="text-red-600 animate-pulse flex gap-2">
            <StopCircle /> Stop Recording
          </h2>
        ) : (
          <h2 className="text-primary flex gap-2">
            <Mic /> Record Answer
          </h2>
        )}
      </Button>

      <textarea
        className="w-full h-32 p-4 mt-4 border rounded-md text-gray-800"
        placeholder="Your answer will appear here..."
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
      />
    
      <Button className="mt-4" onClick={UpdateUserAnswer} disabled={loading || !userAnswer.trim()}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Answer"}
      </Button>
    </div>
  );
};

export default RecordAnswerSection;
