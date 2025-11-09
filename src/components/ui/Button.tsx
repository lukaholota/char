"use client";

interface Props {
  title: string;
  onClick: () => void;
  bg?: string;
}

export const Button = ({ title, onClick, bg='bg-slate-600' }: Props ) => {
  return (
    <button className={`rounded-xl p-2 ${bg}`} onClick={onClick}>
      {title}
    </button>
  )
}