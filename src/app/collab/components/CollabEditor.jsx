"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "../page.module.css";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { Users } from "lucide-react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { QuillBinding } from "y-quill";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";

const CollabEditor = ({ roomId, username }) => {
  const [onlineUsers, setOnlineUsers] = useState(0);
  const editorRef = useRef(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WS_URL, roomId, ydoc);
    const ytext = ydoc.getText("quill");

    const quill = new Quill(editorRef.current, {
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

    const binding = new QuillBinding(ytext, quill, provider.awareness);

    provider.awareness.setLocalStateField("user", {
      name: username,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
    });

    provider.awareness.on("change", () => {
      setOnlineUsers(provider.awareness.getStates().size);
    });

    return () => {
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId, username]);

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
