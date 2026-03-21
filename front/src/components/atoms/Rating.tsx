import React from "react";

type RatingProps = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
};

export const Rating: React.FC<RatingProps> = ({ value, max = 5, size = "md" }) => {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  return (
    <div className="flex gap-0.5" aria-label={`評価 ${value} / ${max}`}>
      {stars.map((star) => (
        <svg
          key={star}
          className={`${sizeClasses[size]} ${
            star <= value ? "text-red-400 fill-current" : "text-gray-200 fill-current"
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
};
