import validWords from "./validWords.js";
import otherAnswers from "./otherAnswers.js";

export const isValidGuess = async (
  input,
  list = otherAnswers.concat(validWords)
) => {
  return (
    (/[a-z]{5}/.test(input) &&
      (validWords.includes(input) || otherAnswers.includes(input)) &&
      list.includes(input)) ||
    "Not a valid 5 letter word in the remaining list"
  );
};

export const getValidAnswers = (guess, responses, listToCheck = validWords) => {
  const validLetters = guess
    .split("")
    .filter((_, index) => responses[index] !== "absent");

  const fullFilter = listToCheck.filter((word) => {
    return (
      word !== guess &&
      word.split("").every((letter, index) => {
        if (responses[index] === "correct") {
          return letter === guess[index];
        }

        if (responses[index] === "present") {
          return word.indexOf(guess[index]) > -1 && letter !== guess[index];
        }

        return (
          word.indexOf(guess[index]) === -1 ||
          word.split("").filter((char) => char === guess[index]).length <=
            validLetters.filter((char) => char === guess[index]).length
        );
      })
    );
  });

  return fullFilter;
};

export default async function makeGuess(page, word, guessNumber = 0) {
  for (const letter of word) {
    await page.waitForTimeout(50);

    const key = await page.evaluateHandle(`
        document.querySelector("body > game-app").shadowRoot.querySelector("#game > game-keyboard").shadowRoot.querySelector("#keyboard button[data-key='${letter.toLowerCase()}']")`);
    if (key) await key.click();
    else throw new Error("Key not found");
  }

  const enter = await page.evaluateHandle(`
        document.querySelector("body > game-app").shadowRoot.querySelector("#game > game-keyboard").shadowRoot.querySelector("#keyboard button[data-key='↵']")`);
  if (enter) await enter.click();

  await page.waitForTimeout(2000);

  let out = [];

  for (let i = 1; i <= word.length; i++) {
    const answer1 = await page.evaluateHandle(
      `document.querySelector("body > game-app").shadowRoot.querySelector("#board > game-row:nth-child(${
        guessNumber + 1
      })").shadowRoot.querySelector("div > game-tile:nth-child(${i})")`
    );
    const ansOut = await page.evaluateHandle((body) => body._state, answer1);
    out.push(await ansOut.jsonValue());
  }

  return out;
}
