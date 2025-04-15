"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smoothScroll = async (page) => {
    const scrollStepDelay = 1;
    const scrollDownSteps = 30;
    const singleScrollDownDistance = 75;
    const scrollUpSteps = 15;
    const singleScrollUpDistance = 150;
    for (let i = 0; i < scrollDownSteps; i++) {
        await page.mouse.wheel({ deltaY: singleScrollDownDistance });
        await new Promise((resolve) => setTimeout(resolve, scrollStepDelay));
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
    for (let i = 0; i < scrollUpSteps; i++) {
        await page.mouse.wheel({ deltaY: -singleScrollUpDistance });
        await new Promise((resolve) => setTimeout(resolve, scrollStepDelay));
    }
};
exports.default = smoothScroll;
