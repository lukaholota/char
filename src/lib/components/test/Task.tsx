export const Task = (
  { name, description, index, onPopTask }
    : { description: string, name: string, index: number, onPopTask: (i: number) => void }) => {
  return (
    <div className="border-2 border-red-500 hover:cursor-pointer" onClick={() => {onPopTask(index)}}>
      <span className="text-blue300">{name}</span>
      <p>{description}</p>
    </div>
  )
}

export default Task