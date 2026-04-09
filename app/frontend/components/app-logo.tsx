export default function AppLogo({ size = "default" }: { size?: "default" | "lg" }) {
  const textSize = size === "lg" ? "text-2xl" : "text-base"

  return (
    <div className="flex items-center">
      <span className={`font-medium tracking-tight ${textSize} text-white`}>
        ALCHEMY<span className="text-[#00ffff]">.</span>
      </span>
    </div>
  )
}
