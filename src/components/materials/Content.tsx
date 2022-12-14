import * as ReactDOM from "react-dom";
import clsx from "clsx";
import {
	useCallback,
	useState,
	useRef,
	useMemo,
	ReactElement,
	DetailedHTMLProps,
	HTMLAttributes,
	useEffect,
	ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import TeX from "@matejmazur/react-katex";
import {
	AddressesType,
	AnswerType,
	CUSTOM_MATERIAL,
	InputBoxElementType,
	MatchBoxElementType,
	MathFunction,
	MathPoint,
	StateType,
} from "@/src/type";
import {
	checkChapterProgress,
	evaluateMath,
	getPracticeAnswer,
	getPracticeId,
	regexPracticeInput,
} from "@/src/utils";
import { Blockquote, Input, Graph, Loader } from "@/src/components";
import { useRouter } from "next/router";
import { BLOCKQUOTE_PRESETS, COLORS } from "@/src/style";
import { useToast } from "@/src/hooks";
import { MatchBox } from "./Match";

interface ContentProps {
	markdown: any;
	addreses: AddressesType;
	stateSolved: StateType<number>;
	stateAnswer: StateType<Partial<AnswerType>>;
	stateAccept: StateType<AnswerType>;
	stateLoading: StateType<boolean>;
	stateChecking: StateType<boolean>;
	stateSubmitted: StateType<boolean>;
	trueLoading: boolean;
	page: number;
	handleCheckAnswer: (ans: string, id: string, flag?: boolean) => boolean;
	onChapterChange?: () => void;
}

export function Content({
	markdown,
	addreses,
	stateSolved,
	stateAnswer,
	stateAccept,
	stateLoading,
	stateSubmitted,
	stateChecking,
	trueLoading,
	page,
	handleCheckAnswer,
	onChapterChange,
}: ContentProps) {
	const router = useRouter();
	const [loading, setLoading] = stateLoading;
	const [answer, setAnswer] = stateAnswer;
	const [accept, setAccept] = stateAccept;
	const [solved, setSolved] = stateSolved;
	const [submitted, setSubmmited] = stateSubmitted;
	const answerInputBoxParentElement = useRef<InputBoxElementType[]>([]);
	const matchParentElement = useRef<MatchBoxElementType[]>([]);
	const [active, setActive] = useState<any>(null);
	const checking = stateChecking[0];

	const { practice } = addreses;

	const addToast = useToast();

	const hanldeShowAnswerFeedback = useCallback(() => {
		if (!checking || !submitted) return;

		if (solved === 1) {
			addToast({
				title: "Correct!",
				message: "You answered all questions correctly.",
				preset: "success",
			});
			return;
		}

		addToast({
			title: "Incorrect!",
			message: "At least one answer is incorrect.",
			preset: "warning",
		});
	}, [addToast, checking, solved, submitted]);

	useEffect(() => {
		hanldeShowAnswerFeedback();
	}, [checking, hanldeShowAnswerFeedback]);

	const userAnswerStatus = useCallback(
		(practiceId: string) => {
			const specificAnswer = answer[practiceId];
			if (specificAnswer && submitted)
				return handleCheckAnswer(specificAnswer, practiceId, false)
					? "success"
					: "error";
			return undefined;
		},
		[answer, submitted, handleCheckAnswer]
	);

	const renderCustomElement = useCallback(
		(
			parentElement: HTMLElement,
			targetElement: ReactElement,
			group: string,
			id: string
		) => {
			const vessel = document.createElement("div");
			vessel.id = `${group}-${id}`;
			vessel.classList.add(group);

			parentElement.parentElement?.insertBefore(
				vessel,
				parentElement.nextSibling
			);

			ReactDOM.render(targetElement, vessel);
		},
		[]
	);

	const handleOnePairMatch = useCallback(() => {
		if (active && active.type === "complete") {
			setAnswer((prev) => ({
				...prev,
				[active.id]: active.answer,
			}));
			setActive(null);
		}
	}, [active, setAnswer]);

	useEffect(() => {
		handleOnePairMatch();
	}, [active, handleOnePairMatch]);

	const handleGetComponentForm = useCallback((str: string): ReactNode => {
		if (str.match(/\$([^\$])*\$/g)) {
			return <TeX>{str.slice(1, -1)}</TeX>;
		}
		return str;
	}, []);

	const handleSetActive = useCallback(
		(
			type: "target" | "source",
			content: string,
			override: boolean = false
		) => {
			setActive((prev: any) => {
				if (!prev || override) {
					return type === "target"
						? {
								id: content,
								type: "target",
						  }
						: {
								answer: content,
								type: "source",
						  };
				}
				if (type === "target" && prev.type === "source") {
					return {
						id: content,
						answer: prev.answer,
						type: "complete",
					};
				} else if (type === "source" && prev.type === "target") {
					return {
						id: prev.id,
						answer: content,
						type: "complete",
					};
				} else {
					return null;
				}
			});
		},
		[]
	);

	const handleRemoveCustomComponents = useCallback((className: string) => {
		const previousRenders = document.querySelectorAll(`.${className}`);
		previousRenders.forEach((element) => {
			/** @todos Something MIGHT be wrong with this unmount method. */
			element.parentElement?.removeChild(element);
		});
	}, []);

	const handleRemoveAllCustomComponents = useCallback(() => {
		Object.values(CUSTOM_MATERIAL).forEach((group) => {
			handleRemoveCustomComponents(group);
		});
	}, [handleRemoveCustomComponents]);

	const handleRemoveAnswer = useCallback(
		(key: string) => {
			setAnswer((prev) => ({
				...prev,
				[key]: undefined,
			}));
		},
		[setAnswer]
	);

	const handleCheckIfAlreadyMatched = useCallback(
		(
			currentKey: any,
			currentAnswer: any,
			onKeyMatch: null | ((key: string) => void),
			onValueMatch: null | ((key: string) => void)
		) => {
			if (solved) return;
			Object.entries(answer).forEach(([key, value]) => {
				if (onKeyMatch && key === currentKey) {
					onKeyMatch(key);
				} else if (onValueMatch && value === currentAnswer) {
					onValueMatch(key);
				}
			});
		},
		[answer, solved]
	);

	const renderMatchCard = useCallback(
		({
			children,
			className,
			...props
		}: DetailedHTMLProps<
			HTMLAttributes<HTMLDivElement>,
			HTMLDivElement
		>) => (
			<div
				{...props}
				className={clsx(
					"Match_right flex align-self-end justify-center items-center",
					"w-24 px-8 py-2",
					"text-center transition-colors rounded-sm",
					solved === 1
						? "bg-success-2"
						: "bg-primary-2 hover:bg-primary-3",
					className
				)}
			>
				{handleGetComponentForm(children as string)}
			</div>
		),
		[handleGetComponentForm, solved]
	);

	const handleClickMatchedCard = useCallback(
		(practiceId: string) =>
			handleCheckIfAlreadyMatched(
				practiceId,
				null,
				handleRemoveAnswer,
				null
			),
		[handleCheckIfAlreadyMatched, handleRemoveAnswer]
	);

	const handleClickDrop = useCallback(
		(practiceId: string) => {
			let terminate = false;

			handleCheckIfAlreadyMatched(
				practiceId,
				null,
				(key: string) => {
					handleRemoveAnswer(key);
					terminate = true;
				},
				null
			);

			if (active && active.type === "target") {
				if (active.id === practiceId) {
					setActive(null);
				} else {
					handleSetActive("target", practiceId, true);
				}
				terminate = true;
			}

			if (terminate) return;

			handleSetActive("target", practiceId);
		},
		[
			active,
			handleCheckIfAlreadyMatched,
			handleRemoveAnswer,
			handleSetActive,
		]
	);

	const handleClickUnmatchedCard = useCallback(
		(right: string) => {
			let terminate = false;

			handleCheckIfAlreadyMatched(null, right, null, (key: string) => {
				handleRemoveAnswer(key);

				if (active && active.id) setActive(null);
				terminate = true;
			});

			if (active && active.type === "source") {
				if (active.answer === right) {
					setActive(null);
				} else {
					handleSetActive("source", right, true);
				}
				terminate = true;
			}
			if (terminate) return;

			handleSetActive("source", right);
		},
		[
			active,
			handleCheckIfAlreadyMatched,
			handleRemoveAnswer,
			handleSetActive,
		]
	);

	const renderMatchBox = useCallback(
		(practiceId: string, left: string, right: string) => {
			const identifier = `MatchBox-${practiceId}`;
			return (
				<MatchBox
					key={identifier}
					id={identifier}
					practiceId={practiceId}
					active={active}
					answer={answer}
					left={left}
					right={right}
					handleClickMatchedCard={() =>
						handleClickMatchedCard(practiceId)
					}
					handleClickDrop={() => handleClickDrop(practiceId)}
					handleClickUnmatchedCard={() =>
						handleClickUnmatchedCard(right)
					}
					handleGetComponentForm={handleGetComponentForm}
				/>
			);
		},
		[
			active,
			answer,
			handleClickDrop,
			handleClickMatchedCard,
			handleClickUnmatchedCard,
			handleGetComponentForm,
		]
	);

	const renderAnswerBox = useCallback(
		(practiceId: string) => (
			<Input
				key={`InputBox-${practiceId}`}
				id={`InputBox-${practiceId}`}
				onBlur={(e) => {
					if (answer !== accept) {
						setSubmmited(false);
						setAnswer((prev) => ({
							...prev,
							[practiceId]: e.target.value,
						}));
					}
				}}
				defaultValue={answer[practiceId]}
				disabled={
					solved === 1 || userAnswerStatus(practiceId) === "success"
				}
				state={submitted ? userAnswerStatus(practiceId) : undefined}
			/>
		),
		[
			answer,
			solved,
			userAnswerStatus,
			submitted,
			accept,
			setSubmmited,
			setAnswer,
		]
	);

	const handleRenderAnswerBoxes = useCallback(() => {
		handleRemoveCustomComponents("InputBox");

		answerInputBoxParentElement.current.forEach(
			({ parentElement, string }) => {
				const currentId = getPracticeId(string);
				if (currentId) {
					renderCustomElement(
						parentElement,
						renderAnswerBox(currentId),
						CUSTOM_MATERIAL["input"],
						currentId
					);
				}
			}
		);
	}, [handleRemoveCustomComponents, renderAnswerBox, renderCustomElement]);

	const handleRenderMatch = useCallback(() => {
		handleRemoveCustomComponents("MatchBox");

		matchParentElement.current.forEach(({ parentElement, pair, id }) => {
			const left = pair[0];
			const right = pair[1];
			renderCustomElement(
				parentElement,
				renderMatchBox(id, left, right),
				CUSTOM_MATERIAL["match"],
				id
			);
		});
	}, [handleRemoveCustomComponents, renderCustomElement, renderMatchBox]);

	useEffect(() => {
		handleRenderAnswerBoxes();
		handleRenderMatch();
	}, [
		page,
		active,
		accept,
		answer,
		solved,
		userAnswerStatus,
		handleRenderAnswerBoxes,
		handleRenderMatch,
	]);

	const handleRemoveUndefinedAnswers = useCallback(() => {
		const entries = Object.entries(answer);
		const newAnswer: { [key: string]: string } = {};
		let different = false;
		entries.forEach(([k, v]) => {
			if (typeof v !== "undefined") {
				newAnswer[k] = v;
			} else {
				different = true;
			}
		});
		if (different) {
			setAnswer(newAnswer);
		}
	}, [answer, setAnswer]);

	useEffect(() => {
		handleRemoveUndefinedAnswers();
	}, [answer, handleRemoveUndefinedAnswers]);

	const handleGetExistingAnswerIfAny = useCallback(() => {
		const existingAnswers = checkChapterProgress(practice);
		const practiceIds = Object.keys(accept);

		if (practiceIds.length === 0) return;

		let currentAnswers = {};
		let allAnswersAreCorrect = true;
		practiceIds.forEach((practiceId: string) => {
			if (
				existingAnswers &&
				existingAnswers[practiceId] &&
				handleCheckAnswer(
					existingAnswers[practiceId],
					practiceId,
					false
				)
			) {
				const specificAnswer = existingAnswers[practiceId];
				if (specificAnswer) {
					currentAnswers = {
						...currentAnswers,
						[practiceId]: specificAnswer,
					};
				}
			} else {
				allAnswersAreCorrect = false;
			}
		});

		if (
			allAnswersAreCorrect &&
			Object.keys(currentAnswers).length === practiceIds.length &&
			practiceIds.length > 0
		) {
			setAnswer(currentAnswers);
			setSubmmited(true);
			setSolved(1);
		}
	}, [
		practice,
		accept,
		handleCheckAnswer,
		setAnswer,
		setSubmmited,
		setSolved,
	]);

	useEffect(() => {
		handleGetExistingAnswerIfAny();
	}, [accept, handleGetExistingAnswerIfAny]);

	const handleConvertCodeToComponents = useCallback(() => {
		if (!loading) return;

		const container = document.getElementsByClassName(
			"CourseMaterial_wrapper"
		)[0];

		handleRemoveAllCustomComponents();

		const elements = document.querySelectorAll(
			".CourseMaterial_content .CustomMaterialInvoker"
		);

		let inputElementsRendered = 0;

		let answerKeys = {};

		answerInputBoxParentElement.current = [];
		matchParentElement.current = [];

		elements.forEach((element, index) => {
			const string = element.innerHTML;
			const parentElement = element.parentElement;

			let mathFuncs: MathFunction[] = [];
			let mathPoints: MathPoint[] = [];

			if (container && parentElement && string.startsWith("[graph]")) {
				const params = string.replace("[graph]", "").split("_");
				params.forEach((param) => {
					if (param.startsWith("function:")) {
						const funcs = param.replace("function:", "").split(",");
						mathFuncs = funcs.map((func: string) => {
							return (x: number) => {
								const value = evaluateMath(
									func.replace(/x/g, `(${x})`)
								);
								return value;
							};
						});
					} else if (param.startsWith("point:")) {
						const points = param.replace("point:", "").split("/");
						points.forEach((point) => {
							const parse = point.split("-");
							if (parse.length === 2) {
								const variant = parse[1];
								const coords = parse[0]
									.split(",")
									.map((x) => Number(x));
								const [y, x] = coords;
								if (coords.length === 2) {
									mathPoints.push({
										points: [y, x],
										variant: variant ?? "solid",
									});
								}
							}
						});
					}
				});

				if (mathFuncs.length > 0 || mathPoints.length > 0) {
					renderCustomElement(
						parentElement,
						<Graph
							id={string}
							mathFunctions={mathFuncs}
							mathPoints={mathPoints}
						/>,
						CUSTOM_MATERIAL["graph"],
						string
					);
				}
			}
			if (
				container &&
				parentElement &&
				string.match(regexPracticeInput)
			) {
				const [currentId, currentAnswer] = [
					getPracticeId(string),
					getPracticeAnswer(string),
				];

				if (currentId && currentAnswer) {
					answerKeys = {
						...answerKeys,
						[currentId]: currentAnswer,
					};

					answerInputBoxParentElement.current = [
						...answerInputBoxParentElement.current,
						{
							parentElement,
							string,
						},
					];

					inputElementsRendered++;
				}
			}
			if (container && parentElement && string.match(/\[match\]/g)) {
				const detectedPair = string.toString().split("@");

				if (detectedPair && detectedPair.length === 5) {
					const [tag, id, left, right, space] = detectedPair;
					matchParentElement.current = [
						...matchParentElement.current,
						{
							parentElement,
							pair: [left, right],
							id,
						},
					];

					answerKeys = {
						...answerKeys,
						[id]: `${right}`,
					};

					inputElementsRendered++;
				}
			}
		});

		if (matchParentElement.current.length > 0 && solved !== 1) {
			matchParentElement.current.sort(() => Math.random() - 0.5);
			let randomizedPairs = matchParentElement.current.map(({ pair }) => {
				return pair[1];
			});

			randomizedPairs.sort(() => Math.random() - 0.5);
			matchParentElement.current = matchParentElement.current.map(
				(parent, idx: number) => ({
					...parent,
					pair: [parent.pair[0], randomizedPairs[idx]],
				})
			);
		}

		if (inputElementsRendered > 0 && Object.values(answerKeys).length > 0) {
			setSolved(0);
			setAccept((prev) => ({
				...prev,
				...answerKeys,
			}));
			handleRenderAnswerBoxes();
			handleRenderMatch();
		} else {
			setSolved(-1);
		}
	}, [
		loading,
		handleRemoveAllCustomComponents,
		solved,
		renderCustomElement,
		setSolved,
		setAccept,
		handleRenderAnswerBoxes,
		handleRenderMatch,
	]);

	const handlePrepareNewPage = useCallback(() => {
		if (loading) {
			handleRemoveAllCustomComponents();
			handleConvertCodeToComponents();
			setLoading(false);
		}
	}, [
		handleConvertCodeToComponents,
		handleRemoveAllCustomComponents,
		loading,
		setLoading,
	]);

	useEffect(() => {
		handlePrepareNewPage();
	}, [page, handlePrepareNewPage, handleRemoveAllCustomComponents]);

	const handleCheckForCodeInvokedElements = useCallback(
		(element: any, specific: string = "") => {
			if (specific !== "") {
				return element.toString().match(new RegExp(`\[${specific}\]`));
			}
			return element.toString().match(/\[[^\]]*\]/g);
		},
		[]
	);

	const handlePreTransformCode = useCallback(
		({ node, children, ...props }: any) => {
			return handleCheckForCodeInvokedElements(children) ? (
				<span className="CustomMaterialInvoker hidden">{children}</span>
			) : (
				<code>{children}</code>
			);
		},
		[handleCheckForCodeInvokedElements]
	);

	const handleGetBlockquoteWithoutTags = useCallback((element: any) => {
		const regex = /\#([^\#])*\#/g;

		return element.map((str: any) => {
			if (typeof str === "object") {
				const newChildren = str.props.children.map((x: any) =>
					typeof x === "string" ? x.replace(regex, "") : x
				);
				return {
					...str,
					props: {
						...str.props,
						children: newChildren,
					},
				};
			}
			return str.replace(regex, "");
		});
	}, []);

	const handleCheckForSpecialBlockquote = useCallback(
		(element: any, type: string) => {
			const regex = new RegExp(`\#${type}\#`);

			return element.some((str: any) => {
				if (typeof str === "object") {
					return str.props.children.some((x: any) =>
						typeof x === "string" ? x.match(regex) : false
					);
				}
				return str.match(regex);
			});
		},
		[]
	);

	const handlePreTransformBlockquote = useCallback(
		({ node, children, ...props }: any) => {
			const taglessChildren = handleGetBlockquoteWithoutTags(children);

			let quoteProps = {};

			const presets = BLOCKQUOTE_PRESETS.filter((c) =>
				handleCheckForSpecialBlockquote(children, c)
			);

			if (presets.length === 1) {
				quoteProps = {
					className:
						presets[0] === "explanation" && !solved && "hidden",
					preset: presets[0],
				};
			}

			return <Blockquote {...quoteProps}>{taglessChildren}</Blockquote>;
		},
		[
			handleCheckForSpecialBlockquote,
			handleGetBlockquoteWithoutTags,
			solved,
		]
	);

	const handleRouteChangeStart = useCallback(() => {
		onChapterChange && onChapterChange();
		handleRemoveAllCustomComponents();
	}, [handleRemoveAllCustomComponents, onChapterChange]);

	useEffect(() => {
		router.events.on("routeChangeStart", handleRouteChangeStart);
		return () => {
			router.events.off("routeChangeStart", handleRouteChangeStart);
		};
	}, [
		onChapterChange,
		handlePrepareNewPage,
		handleRemoveAllCustomComponents,
		router.events,
		handleRouteChangeStart,
	]);

	return (
		<div className="relative flex w-full h-full overflow-x-hidden overflow-y-scroll">
			<div
				className={clsx(
					"self-center w-full h-full justify-self-center mx-auto",
					"flex justify-center items-center z-10",
					!trueLoading && "hidden"
				)}
			>
				<Loader />
			</div>
			<article
				className={clsx(
					"CourseMaterial_wrapper",
					"absolute left-0 top-0",
					"w-full h-full pt-24 p-adapt-sm",
					trueLoading && "hidden"
				)}
			>
				<ReactMarkdown
					className="CourseMaterial_content"
					components={{
						code: handlePreTransformCode,
						blockquote: handlePreTransformBlockquote,
					}}
					remarkPlugins={[remarkMath, remarkGfm]}
					rehypePlugins={[rehypeKatex]}
				>
					{markdown}
				</ReactMarkdown>
			</article>
		</div>
	);
}
