import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import "./Lingo.css";
import settings from "./icons/settings.svg";
import star from "./icons/star.svg";

const RIGHT_SPOT = 1;
const WRONG_SPOT = 2;

interface GradeResult {
  rightSpotIndexes: number[];
  wrongSpotIndexes: number[];
}

const gradeGuess = (guess: string, targetWord: string): GradeResult => {
  const gradeResult: GradeResult = {
    rightSpotIndexes: [],
    wrongSpotIndexes: [],
  };

  let prunedGuess = "";
  let prunedTarget = "";
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === targetWord[i]) {
      gradeResult.rightSpotIndexes.push(i);
    } else {
      prunedGuess += guess[i];
      prunedTarget += targetWord[i];
    }
  }

  // sort alphabetically
  const prunedSortedGuess = prunedGuess.split("").sort().join("");
  const prunedSortedTarget = prunedTarget.split("").sort().join("");
  const wrongSpotLetters: { [letter: string]: number } = {};

  let guessPointer = 0;
  let targetPointer = 0;
  while (guessPointer < prunedGuess.length && targetPointer < prunedTarget.length) {
    if (prunedSortedGuess[guessPointer] === prunedSortedTarget[targetPointer]) {
      wrongSpotLetters[prunedSortedGuess[guessPointer]] = (wrongSpotLetters[prunedSortedGuess[guessPointer]] || 0) + 1;
      guessPointer++;
      targetPointer++;
    } else if (prunedSortedGuess[guessPointer] < prunedSortedTarget[targetPointer]) {
      guessPointer++;
    } else {
      targetPointer++;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] !== targetWord[i] && wrongSpotLetters[guess[i]]) {
      gradeResult.wrongSpotIndexes.push(i);
      wrongSpotLetters[guess[i]]--;
    }
  }

  return gradeResult;
};

export const Lingo: React.FC = () => {
  const times = (length: number, fn: (n: number) => JSX.Element) => Array.from({ length }, (_, i) => fn(i));
  const [cursorPosition, setCursorPosition] = useState(1);
  const [currentLine, setCurrentLine] = useState(0);
  const [guesses, setGuesses] = useState<string[][]>(Array.from(Array(5), () => new Array(5).fill("")));
  const [showInvalidWordAlert, setShowInvalidWordAlert] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [viewingSettings, setViewingSettings] = useState(false);
  const [alertMessage, setAlertMessage] = useState("A");
  const [targetWord, setTargetWord] = useState("");
  const [difficulty, setDifficulty] = useState(localStorage.getItem("LINGO_DIFFICULTY") || "normal");
  const dictionary = useRef<Set<string>>(new Set<string>());
  const wordList = useRef<string[]>([]);
  const grades = useRef<number[][]>(Array.from(Array(5), () => new Array(5).fill(0)));
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gameRef.current?.focus();

    dictionary.current = new Set<string>();

    fetch("/dictionary.txt")
      .then((response) => response.text())
      .then((text) => {
        const words = text.split(/\s+/);
        words.forEach((word) => dictionary.current.add(word));
      });

    fetch("/wordlist.txt")
      .then((response) => response.text())
      .then((text) => {
        const words = text.split(/\s+/);
        words.forEach((word) => wordList.current.push(word));
      })
      .then(() => prepareNewLine(currentLine, true));
  }, []);

  const firstRowKeyboard = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
  const secondRowKeyboard = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
  const thirdRowKeyboard = ["z", "x", "c", "v", "b", "n", "m"];

  const prepareNewLine = (lineNumber: number, newGame: boolean) => {
    if (lineNumber === 5) {
      return;
    }

    let word = targetWord;
    if (lineNumber === 0 && newGame) {
      word = wordList.current[Math.floor(Math.random() * wordList.current.length)];
      setGameOver(false);
      setTargetWord(word);
      setWin(false);
      grades.current = Array.from(Array(5), () => new Array(5).fill(0));
    }

    let copy = newGame ? Array.from(Array(5), () => new Array(5).fill("")) : [...guesses];
    copy[lineNumber][0] = word[0];
    for (let i = 1; i < 5; i++) {
      copy[lineNumber][i] = "";
    }
    setGuesses(copy);
    setCurrentLine(lineNumber);
    setCursorPosition(1);
  };

  const updateBoard = (row: number, column: number, value: string) => {
    const copy = [...guesses];
    copy[row][column] = value;
    setGuesses(copy);
  };

  const handleKeyPress = (key: string) => {
    if (key === "Backspace" && !gameOver) {
      if (guesses[currentLine][cursorPosition] !== "") {
        updateBoard(currentLine, cursorPosition, "");
        setCursorPosition(cursorPosition);
      } else if (cursorPosition > 1) {
        updateBoard(currentLine, cursorPosition - 1, "");
        setCursorPosition(cursorPosition - 1);
      }
    } else if (key === "Enter" && !gameOver) {
      const word = guesses[currentLine].join("");
      if (word.length === 5) {
        if (!dictionary.current.has(word)) {
          prepareNewLine(currentLine, false);
          setShowInvalidWordAlert(true);
          setAlertMessage(word.toUpperCase() + " is not a valid word.");
          setTimeout(() => {
            setShowInvalidWordAlert(false);
          }, 2000);
        } else {
          if (currentLine < 5) {
            const gradeResult = gradeGuess(word, targetWord);
            if (difficulty === "normal") {
              for (let i = 0; i < gradeResult.rightSpotIndexes.length; i++) {
                grades.current[currentLine][gradeResult.rightSpotIndexes[i]] = RIGHT_SPOT;
              }
              for (let i = 0; i < gradeResult.wrongSpotIndexes.length; i++) {
                grades.current[currentLine][gradeResult.wrongSpotIndexes[i]] = WRONG_SPOT;
              }
            } else {
              let pointer = 0;
              for (let i = 1; i < gradeResult.rightSpotIndexes.length; i++) {
                grades.current[currentLine][pointer++] = RIGHT_SPOT;
              }
              for (let i = 0; i < gradeResult.wrongSpotIndexes.length; i++) {
                grades.current[currentLine][pointer++] = WRONG_SPOT;
              }
            }
            if (gradeResult.rightSpotIndexes.length === 5) {
              if (difficulty === "hard") {
                grades.current[currentLine][4] = RIGHT_SPOT;
              }
              setGameOver(true);
              setWin(true);
              setAlertMessage("Nice!");
            } else if (currentLine === 4) {
              setGameOver(true);
              setWin(false);
              setAlertMessage("The word was " + targetWord.toUpperCase() + ".");
            } else {
              prepareNewLine(currentLine + 1, false);
            }
          }
        }
      }
    } else if (key.match(/^[a-z]$/i) && cursorPosition < 5 && !gameOver) {
      updateBoard(currentLine, cursorPosition, key.toLowerCase());
      setCursorPosition(cursorPosition + 1);
    } else if (key === " ") {
      prepareNewLine(0, true);
    } else if ((key === "Enter" || key === " ") && gameOver) {
      prepareNewLine(0, true);
    } else if (key === "ArrowLeft" && cursorPosition > 1) {
      setCursorPosition(cursorPosition - 1);
    } else if (key === "ArrowRight" && cursorPosition < 4) {
      setCursorPosition(cursorPosition + 1);
    }
  };

  const changeDifficulty = (newDifficulty: string) => {
    if (newDifficulty !== difficulty) {
      localStorage.setItem("LINGO_DIFFICULTY", newDifficulty);
      setDifficulty(newDifficulty);
      prepareNewLine(0, true);
    }
  };

  if (viewingSettings) {
    return (
      <div className="top-level">
        <div>Difficulty</div>
        <div className="difficulty-selector">
          <div className={classNames("difficulty-item", difficulty === "normal" && "selected")} onClick={() => changeDifficulty("normal")}>
            NORMAL
          </div>
          <div className={classNames("difficulty-item", difficulty === "hard" && "selected")} onClick={() => changeDifficulty("hard")}>
            HARD
          </div>
        </div>
        <div className="difficulty-description">
          {difficulty === "normal"
            ? "Letters are marked whether they are right or in the wrong spot."
            : "You are only told the number of letters in the right and wrong spot, not including the first letter."}
        </div>
        <button className="done-button" onClick={() => setViewingSettings(false)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="top-level" tabIndex={0} onKeyDown={(e) => handleKeyPress(e.key)} ref={gameRef}>
      <div className="game-header">
        <div>?</div>
        <div style={{ color: difficulty === "normal" ? "white" : "crimson" }}>LINGO</div>
        <div onClick={() => setViewingSettings(true)}>
          <img src={settings} alt="settings" />
        </div>
      </div>
      <div className={classNames(!showInvalidWordAlert && !gameOver && "hidden-alert", (showInvalidWordAlert || !win) && "invalid-word", win && "win")}>
        {alertMessage}
      </div>
      <div className="board-container">
        <div className="board">
          {times(25, (i: number) => {
            const row = Math.floor(i / 5);
            const column = i % 5;
            const clickable = column > 0 && row === currentLine;
            const grade = grades.current[row][column];
            const gradeClass = grade === RIGHT_SPOT ? "right-spot" : grade === WRONG_SPOT ? "wrong-spot" : "";
            return (
              <div
                className={classNames("cell", grade > 0 && gradeClass, row === currentLine && cursorPosition === column && "selected")}
                key={i}
                onClick={clickable ? () => setCursorPosition(column) : undefined}
              >
                {guesses[row][column]}
              </div>
            );
          })}
        </div>
      </div>

      <div className="keyboard-container">
        <div className="keyboard-row">
          {times(firstRowKeyboard.length, (i: number) => {
            return (
              <div className="keyboard-item" key={i} onClick={() => handleKeyPress(firstRowKeyboard[i])}>
                {firstRowKeyboard[i]}
              </div>
            );
          })}
        </div>
        <div className="keyboard-row">
          <div className="keyboard-item spacer" />
          {times(secondRowKeyboard.length, (i: number) => {
            return (
              <div className="keyboard-item" key={i} onClick={() => handleKeyPress(secondRowKeyboard[i])}>
                {secondRowKeyboard[i]}
              </div>
            );
          })}
          <div className="keyboard-item spacer" />
        </div>
        <div className="keyboard-row">
          <div className="keyboard-item large enter" onClick={() => handleKeyPress("Enter")}>
            enter
          </div>
          {times(thirdRowKeyboard.length, (i: number) => {
            return (
              <div className="keyboard-item" key={i} onClick={() => handleKeyPress(thirdRowKeyboard[i])}>
                {thirdRowKeyboard[i]}
              </div>
            );
          })}
          <div className="keyboard-item large delete" onClick={() => handleKeyPress("Backspace")}>
            delete
          </div>
        </div>
      </div>
    </div>
  );
};
