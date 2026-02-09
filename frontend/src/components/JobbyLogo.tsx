"use client";
import { useState } from "react";

interface JobbyLogoProps {
  /** Size variant - affects the logo sizing */
  size?: "sm" | "md" | "lg";
}

export function JobbyLogo({ size = "md" }: JobbyLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: "w-28",
    md: "w-36",
    lg: "w-52",
  };

  return (
    <div
      className={`relative cursor-pointer select-none ${sizeClasses[size]} -my-4`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base logo (background-removed SVG) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/jobby_bg_remove.svg"
        alt="Jobby Logo"
        className="w-full h-auto"
      />

      {/* Animated face overlay — same viewBox as the SVG so coordinates align */}
      <svg
        viewBox="0 0 2240 1920"
        className="absolute inset-0 w-full h-full pointer-events-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left eye — drawn as ∪ arc; scaleY(-1) flips to ∩ on hover,
            passing through scaleY(0) mid-transition for a natural blink */}
        <path
          d="M430 1210 Q470 1250 510 1210"
          stroke="#1e3a5f"
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
          style={{
            transformOrigin: "470px 1210px",
            transform: isHovered ? "scaleY(-1)" : "scaleY(1)",
            transition: "transform 0.3s ease-in-out",
          }}
        />

        {/* Right eye */}
        <path
          d="M698 1210 Q738 1250 778 1210"
          stroke="#1e3a5f"
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
          style={{
            transformOrigin: "738px 1210px",
            transform: isHovered ? "scaleY(-1)" : "scaleY(1)",
            transition: "transform 0.3s ease-in-out",
          }}
        />

        {/* Left cheek blush */}
        <ellipse cx="440" cy="1268" rx="28" ry="16" fill="#60A5FA" opacity="0.5" />
        {/* Right cheek blush */}
        <ellipse cx="762" cy="1268" rx="28" ry="16" fill="#60A5FA" opacity="0.5" />

        {/* Mouth — scales up to a surprised "O" on hover */}
        <ellipse
          cx="605"
          cy="1310"
          rx="22"
          ry="14"
          fill="#1e3a5f"
          style={{
            transformOrigin: "605px 1310px",
            transform: isHovered ? "scale(1.4, 2.2)" : "scale(1, 1)",
            transition: "transform 0.3s ease-in-out",
          }}
        />
      </svg>
    </div>
  );
}
