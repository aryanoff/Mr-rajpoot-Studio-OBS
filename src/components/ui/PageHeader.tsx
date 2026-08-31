import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-text-secondary mt-1 max-w-xl">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0">
          {action}
        </div>
      )}
    </motion.div>
  );
}
