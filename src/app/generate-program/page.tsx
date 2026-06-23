"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { vapi } from "@/lib/vapi";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mockGenerateProgram } from "./actions";

const GenerateProgramPage = () => {
  const [callActive, setCallActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [callEnded, setCallEnded] = useState(false);

  // E2E Test Panel State
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testAge, setTestAge] = useState("26");
  const [testHeight, setTestHeight] = useState("178 cm");
  const [testWeight, setTestWeight] = useState("72 kg");
  const [testInjuries, setTestInjuries] = useState("None");
  const [testWorkoutDays, setTestWorkoutDays] = useState("Monday, Wednesday, Friday");
  const [testFitnessGoal, setTestFitnessGoal] = useState("Build Muscle");
  const [testFitnessLevel, setTestFitnessLevel] = useState("Intermediate");
  const [testDietRestrictions, setTestDietRestrictions] = useState("None");
  const [testError, setTestError] = useState("");

  const clerk = useUser();
  const isTest = typeof window !== "undefined" && (
    window.location.search.includes("test=true") || 
    document.cookie.includes("test=true")
  );
  const user = isTest ? {
    id: "user_test_12345",
    firstName: "Arjun",
    lastName: "Sharma",
    fullName: "Arjun Sharma",
    imageUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150",
    primaryEmailAddress: {
      emailAddress: "arjun.sharma@example.com"
    }
  } as any : clerk.user;

  const router = useRouter();

  const messageContainerRef = useRef<HTMLDivElement>(null);

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setTestError("");
    setMessages([{ role: "assistant", content: "Initializing visual test flow..." }]);
    try {
      const result = await mockGenerateProgram({
        user_id: user?.id,
        age: testAge,
        height: testHeight,
        weight: testWeight,
        injuries: testInjuries,
        workout_days: testWorkoutDays,
        fitness_goal: testFitnessGoal,
        fitness_level: testFitnessLevel,
        dietary_restrictions: testDietRestrictions,
      });

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Plan generated successfully! Saving to Convex..." }
        ]);
        setCallEnded(true);
      } else {
        setTestError(result.error || "Failed to generate program");
        setConnecting(false);
      }
    } catch (error: any) {
      setTestError(error.message || "Failed to generate program");
      setConnecting(false);
    }
  };

  // SOLUTION to get rid of "Meeting has ended" error
  useEffect(() => {
    const originalError = console.error;
    // override console.error to ignore "Meeting has ended" errors
    console.error = function (msg, ...args) {
      if (
        msg &&
        (msg.includes("Meeting has ended") ||
          (args[0] && args[0].toString().includes("Meeting has ended")))
      ) {
        console.log("Ignoring known error: Meeting has ended");
        return; // don't pass to original handler
      }

      // pass all other errors to the original handler
      return originalError.call(console, msg, ...args);
    };

    // restore original handler on unmount
    return () => {
      console.error = originalError;
    };
  }, []);

  // auto-scroll messages
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // navigate user to profile page after the call ends
  useEffect(() => {
    if (callEnded) {
      const redirectTimer = setTimeout(() => {
        router.push(isTest ? "/profile?test=true" : "/profile");
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [callEnded, router, isTest]);

  // setup event listeners for vapi
  useEffect(() => {
    const handleCallStart = () => {
      console.log("Call started");
      setConnecting(false);
      setCallActive(true);
      setCallEnded(false);
    };

    const handleCallEnd = () => {
      console.log("Call ended");
      setCallActive(false);
      setConnecting(false);
      setIsSpeaking(false);
      setCallEnded(true);
    };

    const handleSpeechStart = () => {
      console.log("AI started Speaking");
      setIsSpeaking(true);
    };

    const handleSpeechEnd = () => {
      console.log("AI stopped Speaking");
      setIsSpeaking(false);
    };
    const handleMessage = (message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { content: message.transcript, role: message.role };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const handleError = (error: any) => {
      console.log("Vapi Error", error);
      setConnecting(false);
      setCallActive(false);
    };

    vapi
      .on("call-start", handleCallStart)
      .on("call-end", handleCallEnd)
      .on("speech-start", handleSpeechStart)
      .on("speech-end", handleSpeechEnd)
      .on("message", handleMessage)
      .on("error", handleError);

    // cleanup event listeners on unmount
    return () => {
      vapi
        .off("call-start", handleCallStart)
        .off("call-end", handleCallEnd)
        .off("speech-start", handleSpeechStart)
        .off("speech-end", handleSpeechEnd)
        .off("message", handleMessage)
        .off("error", handleError);
    };
  }, []);

  const toggleCall = async () => {
    if (callActive) vapi.stop();
    else {
      try {
        setConnecting(true);
        setMessages([]);
        setCallEnded(false);

        const fullName = user?.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : "There";
        //console.log("🧠 Sending user_id to backend:", user?.id);

        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "";
        await vapi.start(assistantId, {
          variableValues: {
            full_name: fullName,
            user_id: user?.id,
          },
        });
      } catch (error) {
        console.log("Failed to start call", error);
        setConnecting(false);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-foreground overflow-hidden  pb-6 pt-24">
      <div className="container mx-auto px-4 h-full max-w-5xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-mono">
            <span>Generate Your </span>
            <span className="text-primary uppercase">Fitness Program</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Have a voice conversation with our AI assistant to create your personalized plan
          </p>
        </div>

        {/* VIDEO CALL AREA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* AI ASSISTANT CARD */}
          <Card className="bg-card/90 backdrop-blur-sm border border-border overflow-hidden relative">
            <div className="aspect-video flex flex-col items-center justify-center p-6 relative">
              {/* AI VOICE ANIMATION */}
              <div
                className={`absolute inset-0 ${
                  isSpeaking ? "opacity-30" : "opacity-0"
                } transition-opacity duration-300`}
              >
                {/* Voice wave animation when speaking */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center items-center h-20">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`mx-1 h-16 w-1 bg-primary rounded-full ${
                        isSpeaking ? "animate-sound-wave" : ""
                      }`}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        height: isSpeaking ? `${Math.random() * 50 + 20}%` : "5%",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* AI IMAGE */}
              <div className="relative size-32 mb-4">
                <div
                  className={`absolute inset-0 bg-primary opacity-10 rounded-full blur-lg ${
                    isSpeaking ? "animate-pulse" : ""
                  }`}
                />

                <div className="relative w-full h-full rounded-full bg-card flex items-center justify-center border border-border overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-secondary/10"></div>
                  <img
                    src="/ai-avatar.png"
                    alt="AI Assistant"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <h2 className="text-xl font-bold text-foreground">CodeFlex AI</h2>
              <p className="text-sm text-muted-foreground mt-1">Fitness & Diet Coach</p>

              {/* SPEAKING INDICATOR */}

              <div
                className={`mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border ${
                  isSpeaking ? "border-primary" : ""
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isSpeaking ? "bg-primary animate-pulse" : "bg-muted"
                  }`}
                />

                <span className="text-xs text-muted-foreground">
                  {isSpeaking
                    ? "Speaking..."
                    : callActive
                      ? "Listening..."
                      : callEnded
                        ? "Generating your plan..."
                        : "Waiting..."}
                </span>
              </div>
            </div>
          </Card>

          {/* USER CARD */}
          <Card className={`bg-card/90 backdrop-blur-sm border overflow-hidden relative`}>
            <div className="aspect-video flex flex-col items-center justify-center p-6 relative">
              {/* User Image */}
              <div className="relative size-32 mb-4">
                <img
                  src={user?.imageUrl}
                  alt="User"
                  // ADD THIS "size-full" class to make it rounded on all images
                  className="size-full object-cover rounded-full"
                />
              </div>

              <h2 className="text-xl font-bold text-foreground">You</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {user ? (user.firstName + " " + (user.lastName || "")).trim() : "Guest"}
              </p>

              {/* User Ready Text */}
              <div className={`mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-card border`}>
                <div className={`w-2 h-2 rounded-full bg-muted`} />
                <span className="text-xs text-muted-foreground">Ready</span>
              </div>
            </div>
          </Card>
        </div>

        {/* MESSAGE COINTER  */}
        {messages.length > 0 && (
          <div
            ref={messageContainerRef}
            className="w-full bg-card/90 backdrop-blur-sm border border-border rounded-xl p-4 mb-8 h-64 overflow-y-auto transition-all duration-300 scroll-smooth"
          >
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div key={index} className="message-item animate-fadeIn">
                  <div className="font-semibold text-xs text-muted-foreground mb-1">
                    {msg.role === "assistant" ? "CodeFlex AI" : "You"}:
                  </div>
                  <p className="text-foreground">{msg.content}</p>
                </div>
              ))}

              {callEnded && (
                <div className="message-item animate-fadeIn">
                  <div className="font-semibold text-xs text-primary mb-1">System:</div>
                  <p className="text-foreground">
                    Your fitness program has been created! Redirecting to your profile...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CALL CONTROLS */}
        <div className="w-full flex flex-col items-center gap-6 mt-6">
          <div className="flex justify-center gap-4">
            <Button
              className={`w-40 text-xl rounded-3xl ${
                callActive
                  ? "bg-destructive hover:bg-destructive/90"
                  : callEnded
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-primary hover:bg-primary/90"
              } text-white relative`}
              onClick={toggleCall}
              disabled={connecting || callEnded}
            >
              {connecting && (
                <span className="absolute inset-0 rounded-full animate-ping bg-primary/50 opacity-75"></span>
              )}

              <span>
                {callActive
                  ? "End Call"
                  : connecting
                    ? "Connecting..."
                    : callEnded
                      ? "View Profile"
                      : "Start Call"}
              </span>
            </Button>

            {!callActive && !callEnded && (
              <Button
                id="test-panel-toggle"
                variant="outline"
                className="text-primary border-primary/50 hover:bg-primary/10 rounded-3xl"
                onClick={() => setShowTestPanel(!showTestPanel)}
              >
                {showTestPanel ? "Hide Test Panel" : "Open Test Panel"}
              </Button>
            )}
          </div>

          {/* VISUAL E2E TEST PANEL */}
          {showTestPanel && !callActive && !callEnded && (
            <div className="w-full max-w-xl bg-card/95 backdrop-blur-md border border-primary/30 rounded-2xl p-6 shadow-lg shadow-primary/5 animate-fadeIn">
              <h3 className="text-lg font-bold font-mono text-primary mb-4 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 bg-primary animate-pulse rounded-full" />
                VISUAL E2E TEST UTILITY
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                This panel allows automated visual testing of the program generation flow by simulating inputs directly without requiring live microphone/voice input.
              </p>

              <form onSubmit={handleTestSubmit} className="space-y-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">AGE</label>
                    <input
                      id="input-age"
                      type="text"
                      className="w-full bg-background border border-border p-2 rounded text-foreground focus:border-primary focus:outline-none"
                      value={testAge}
                      onChange={(e) => setTestAge(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">HEIGHT</label>
                    <input
                      id="input-height"
                      type="text"
                      className="w-full bg-background border border-border p-2 rounded text-foreground focus:border-primary focus:outline-none"
                      value={testHeight}
                      onChange={(e) => setTestHeight(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">WEIGHT</label>
                    <input
                      id="input-weight"
                      type="text"
                      className="w-full bg-background border border-border p-2 rounded text-foreground focus:border-primary focus:outline-none"
                      value={testWeight}
                      onChange={(e) => setTestWeight(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">WORKOUT DAYS</label>
                    <input
                      id="input-workout-days"
                      type="text"
                      className="w-full bg-background border border-border p-2 rounded text-foreground focus:border-primary focus:outline-none"
                      value={testWorkoutDays}
                      onChange={(e) => setTestWorkoutDays(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">FITNESS GOAL</label>
                  <input
                    id="input-fitness-goal"
                    type="text"
                    className="w-full bg-background border border-border p-2 rounded text-foreground focus:border-primary focus:outline-none"
                    value={testFitnessGoal}
                    onChange={(e) => setTestFitnessGoal(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">FITNESS LEVEL</label>
                    <input
                      id="input-fitness-level"
                      type="text"
                      className="w-full bg-background border border-border p-2 rounded text-foreground focus:border-primary focus:outline-none"
                      value={testFitnessLevel}
                      onChange={(e) => setTestFitnessLevel(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">INJURIES</label>
                    <input
                      id="input-injuries"
                      type="text"
                      className="w-full bg-background border border-border p-2 rounded text-foreground focus:border-primary focus:outline-none"
                      value={testInjuries}
                      onChange={(e) => setTestInjuries(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">DIETARY RESTRICTIONS</label>
                  <input
                    id="input-diet-restrictions"
                    type="text"
                    className="w-full bg-background border border-border p-2 rounded text-foreground focus:border-primary focus:outline-none"
                    value={testDietRestrictions}
                    onChange={(e) => setTestDietRestrictions(e.target.value)}
                    required
                  />
                </div>

                {testError && (
                  <div className="text-destructive text-xs p-2 bg-destructive/10 border border-destructive/20 rounded">
                    {testError}
                  </div>
                )}

                <Button
                  id="btn-run-e2e"
                  type="submit"
                  disabled={connecting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono py-2 rounded"
                >
                  {connecting ? "GENERATING PLAN..." : "TRIGGER E2E MOCK GENERATION"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default GenerateProgramPage;
