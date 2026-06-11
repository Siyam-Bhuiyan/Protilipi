// path: src/app/collab/components/CollabEditor.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "../page.module.css";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { Users } from "lucide-react";

const CollabEditor = ({ roomId, username }) => {
  const [quill, setQuill] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const quillInstance = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ script: "sub" }, { script: "super" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ color: [] }, { background: [] }],
          ["link", "image", "code-block"],
          ["clean"],
        ],
      },
      placeholder: "Start writing something amazing...",
    });

    setQuill(quillInstance);

    socketRef.current = new WebSocket("ws://localhost:3002");

    socketRef.current.onopen = () => {
      console.log("WebSocket Connected");
      if (socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: "join",
            roomId,
            username,
          }),
        );
      }
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);

      if (data.type === "userCount") {
        setOnlineUsers(data.count);
      } else if (data.type === "content" && data.roomId === roomId) {
        // Preserve cursor position
        const range = quillInstance.getSelection();

        // Apply the delta
        quillInstance.updateContents(data.delta);

        // Restore cursor position if it existed
        if (range) {
          quillInstance.setSelection(range);
        }
      } else if (data.type === "init-content" && data.roomId === roomId) {
        console.log("Received initial content");
        quillInstance.setContents(data.contents);
        isInitializedRef.current = true;
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [roomId, username]);

  useEffect(() => {
    if (!quill || !socketRef.current) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return;

      console.log("Sending delta:", delta);

      // Check if socket is connected before sending
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        socketRef.current.send(
          JSON.stringify({
            type: "content",
            roomId,
            delta: delta,
            contents: quill.getContents(),
          }),
        );
      } else {
        console.warn(
          "WebSocket not ready. ReadyState:",
          socketRef.current?.readyState,
        );
      }
    };

    quill.on("text-change", handler);
    return () => quill.off("text-change", handler);
  }, [quill, roomId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>আলাপন</h1>
          <span className={styles.roomInfo}>Room: {roomId}</span>
        </div>
        <div className={styles.userInfo}>
          <Users size={20} />
          <span>{onlineUsers} online</span>
        </div>
      </div>
      <div className={styles.editorWrapper}>
        <div ref={editorRef} className={styles.editor} />
      </div>
    </div>
  );
};

export default CollabEditor;
