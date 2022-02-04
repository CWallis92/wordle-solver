#! /usr/bin/env node

import chalk from "chalk";
import inquirer from "inquirer";
import puppeteer from "puppeteer";

import validWords from "./validWords.js";
import otherAnswers from "./otherAnswers.js";

const gameSelector = "game-app::shadow-dom(#game)";

const isValidGuess = async (input) => {
  return (
    (/[a-z]{5}/.test(input) &&
      (validWords.includes(input) || otherAnswers.includes(input))) ||
    "Not a valid 5 letter word"
  );
};

const startGameQuestions = [
  {
    type: "input",
    name: "guess",
    message: "Guess the word!",
    validate: isValidGuess,
  },
];

const continueGameQuestions = [
  {
    type: "input",
    name: "newGuess",
    message: "Have another go:",
    validate: isValidGuess,
  },
];

const makeGuess = async (page, word, guessNumber = 1) => {
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
      `document.querySelector("body > game-app").shadowRoot.querySelector("#board > game-row:nth-child(${guessNumber})").shadowRoot.querySelector("div > game-tile:nth-child(${i})")`
    );
    const ansOut = await page.evaluateHandle((body) => body._state, answer1);
    out.push(await ansOut.jsonValue());
  }

  return out;
};

// Start the game
const play = async () => {
  const { guess } = await inquirer.prompt(startGameQuestions);

  console.log(`You guessed '${guess}'. Fetching...`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.powerlanguage.co.uk/wordle/", {
      waitUntil: ["networkidle0", "load"],
    });

    await page.waitForTimeout(1000);
    const closeIcon = await page.evaluateHandle(`
      document
        .querySelector("body > game-app")
        .shadowRoot.querySelector("#game > game-modal")
        .shadowRoot.querySelector("div > div > div > game-icon")
    `);
    if (closeIcon) await closeIcon.click();

    await page.waitForTimeout(1000);

    let guessCount = 1;
    let outputs = await makeGuess(page, guess);

    let response = guess
      .split("")
      .map((letter, index) => {
        switch (outputs[index]) {
          case "present":
            return chalk.bgYellow(letter);
          case "correct":
            return chalk.bgGreen(letter);
          default:
            return chalk.bgGray(letter);
        }
      })
      .join("");

    console.log(response);

    while (guessCount <= 6 && !outputs.every((res) => res === "correct")) {
      guessCount++;
      const { newGuess } = await inquirer.prompt(continueGameQuestions);
      outputs = await makeGuess(page, newGuess, guessCount);

      response = newGuess
        .split("")
        .map((letter, index) => {
          switch (outputs[index]) {
            case "present":
              return chalk.bgYellow(letter);
            case "correct":
              return chalk.bgGreen(letter);
            default:
              return chalk.bgGray(letter);
          }
        })
        .join("");

      console.log(response);
    }

    if (outputs.every((res) => res === "correct")) {
      console.log(
        `You won in ${guessCount} guess${guessCount === 1 ? "" : "es"}!`
      );
    } else {
      console.log("That wasn't it!");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
};

play();
