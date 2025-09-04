// yoink from https://github.com/bpmn-io/bpmn-to-image

import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import path, { basename, resolve, relative } from 'path';
import { readFileSync } from 'fs';
import { projPath } from '../../..';

interface DiagramOptions {
  input: string;
  outputs: string[];
  minDimensions?: { width: number; height: number };
  footer?: string;
  title?: boolean | string;
  deviceScaleFactor?: number;
}

interface ViewportDimensions {
  width: number;
  height: number;
  diagramHeight: number;
}

async function printDiagram(page: puppeteer.Page, options: DiagramOptions): Promise<void> {
  const {
    input,
    outputs,
    minDimensions,
    footer,
    title = true,
    deviceScaleFactor
  } = options;

  const diagramXML = readFileSync(input, 'utf8');
  const diagramTitle = title === false ? false : (
    typeof title === 'string' && title.length ? title : basename(input)
  );

  await page.goto(`file://${path.join(projPath, 'resources', 'Diagram', 'skeleton.html')}`);

  const desiredViewport = await page.evaluate(async function (diagramXML: string, options: any): Promise<ViewportDimensions> {
    const {
      ...openOptions
    } = options;

    // These functions are defined in skeleton.html
    function openDiagram(xml: string, options: any): Promise<ViewportDimensions> { return (window as any).openDiagram(xml, options); }
    function resize(): void { (window as any).resize(); }
    function toSVG(): string { return (window as any).toSVG(); }

    // returns desired viewport
    return openDiagram(diagramXML, openOptions);
  }, diagramXML, {
    minDimensions,
    title: diagramTitle,
    footer
  });

  page.setViewport({
    width: Math.round(desiredViewport.width),
    height: Math.round(desiredViewport.height),
    deviceScaleFactor: deviceScaleFactor || 1
  });

  await page.evaluate(() => {
    // Function is defined in skeleton.html
    (window as any).resize();
  });

  for (const output of outputs) {
    if (output.endsWith('.pdf')) {
      await page.pdf({
        path: output,
        width: desiredViewport.width,
        height: desiredViewport.diagramHeight
      });
    } else if (output.endsWith('.png')) {
      await page.screenshot({
        path: `${output}.png`,
        clip: {
          x: 0,
          y: 0,
          width: desiredViewport.width,
          height: desiredViewport.diagramHeight
        }
      });
    } else if (output.endsWith('.svg')) {
      const svg = await page.evaluate(() => {
        // Function is defined in skeleton.html
        return (window as any).toSVG();
      });
      fs.writeFileSync(output, svg, 'utf8');
    } else {
      console.error(`Unknown output file format: ${output}`);
    }
  }
}

async function withPage(fn: (page: puppeteer.Page) => Promise<void>): Promise<void> {
  let browser: puppeteer.Browser | undefined;
  try {
    browser = await puppeteer.launch({
      headless: 'shell'
    });
    await fn(await browser.newPage());
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

interface ConversionOptions {
  minDimensions?: { width: number; height: number };
  footer?: string;
  title?: boolean | string;
  deviceScaleFactor?: number;
}

interface Conversion {
  input: string;
  outputs: string[];
}

async function convertAll(conversions: Conversion[], options: ConversionOptions = {}): Promise<void> {
  const {
    minDimensions,
    footer,
    title,
    deviceScaleFactor
  } = options;

  await withPage(async function (page) {
    for (const conversion of conversions) {
      const {
        input,
        outputs
      } = conversion;
      await printDiagram(page, {
        input,
        outputs,
        minDimensions,
        title,
        footer,
        deviceScaleFactor
      });
    }
  });
}

export { convertAll };