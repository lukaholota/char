"use client";

import { useState } from "react";
import { TaskType } from "@/components/test/Tasks";

export const TaskCreator = ({ onAddTask }: { onAddTask: ({ name, description }: TaskType ) => void}) => {
  const [taskName, setTaskName] = useState('')
  const [taskDescription, setTaskDescription] = useState('')

  return (
    <>
      <input placeholder="Name" onChange={(e) => {setTaskName(e.target.value)}} />
      <input placeholder="Description" onChange={(e) => {setTaskDescription(e.target.value)}} />

      <button onClick={() => {
        onAddTask({ name: taskName, description: taskDescription } )
      }}>Create Task</button>


    </>
  )
};
