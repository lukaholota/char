"use client";

import { TaskCreator } from "@/components/test/TaskCreator";
import { useState } from "react";
import Task from "./Task";

export type TaskType = {
  name: string,
  description: string,
}

export const Tasks = () => {
  const [tasks, setTasks] = useState<TaskType[]>([]);

  const handleAddTask = ({ name, description }: TaskType ) => {
    setTasks(prevTasks => [...prevTasks, { name, description }]);
  }
  const popTask = (i: number) => {
    setTasks(prevTasks => prevTasks.filter((p, index) => i != index ))
  }

  return (
    <>
      <TaskCreator onAddTask={handleAddTask} />

      {tasks.map((task, i)  => (
          <Task
            name={task.name}
            description={task.description}
            index={i}
            key={i}
            onPopTask={popTask}
          />
        )
      )}
    </>
  )
}

export default Tasks