import clsx from "clsx";
import { ReactNode, DetailedHTMLProps, ButtonHTMLAttributes } from "react";
import {
	ColorType,
	SizeType,
	INPUT_COLOR_CLASS,
	INPUT_SIZE_CLASS,
} from "@/src/style";

interface InputProps
	extends Omit<
		DetailedHTMLProps<
			ButtonHTMLAttributes<HTMLInputElement>,
			HTMLInputElement
		>,
		"size" | "type"
	> {
	classWrapper?: string;
	className?: string;
	color?: ColorType;
	helperText?: string;
	type?: string;
	state?: "success" | "error";
	disabled?: boolean;
	left?: ReactNode;
	right?: ReactNode;
	size?: SizeType;
}

export function Input({
	classWrapper,
	className,
	color = "primary",
	helperText,
	type,
	state,
	disabled,
	left,
	right,
	size = "m",
	...props
}: InputProps) {
	return (
		<div className={clsx(classWrapper, "flex")}>
			<input
				className={clsx(
					"border-2 border-secondary-4 p-4",
					INPUT_SIZE_CLASS[size],
					INPUT_COLOR_CLASS[color],
					state === "error" && "border-danger-4 outline-danger-4",
					state === "success" && "border-success-4 outline-success-4",
					className
				)}
				type={type}
				disabled={disabled}
				{...props}
			/>
			{helperText && (
				<span
					className={clsx(
						"mt-4",
						state === "error" && "text-danger-4",
						state === "success" && "text-success-4"
					)}
				>
					{helperText}
				</span>
			)}
		</div>
	);
}
