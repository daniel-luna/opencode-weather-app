import { afterEach, describe, expect, test, mock } from "bun:test";
import * as input from "../../src/presentation/input.ts";
import { captureOutput } from "../helpers/captureOutput.ts";
import { capturePrompts } from "../helpers/scriptedInput.ts";

type Callback = (value?: unknown) => void;

type FakeInterface = {
  on(event: string, callback: Callback): FakeInterface;
  close(): void;
};

let createdInterfaces = 0;
let lineHandlers: Callback[] = [];
let closeHandlers: Callback[] = [];

const fakeInterface: FakeInterface = {
  on(event: string, callback: Callback): FakeInterface {
    if (event === "line") {
      lineHandlers.push(callback);
    }
    if (event === "close") {
      closeHandlers.push(callback);
    }
    return fakeInterface;
  },
  close(): void {
    emitClose();
  },
};

mock.module("node:readline/promises", () => ({
  createInterface: (): FakeInterface => {
    createdInterfaces += 1;
    lineHandlers = [];
    closeHandlers = [];
    return fakeInterface;
  },
}));

function typeLine(line: string): void {
  for (const callback of lineHandlers) {
    callback(line);
  }
}

function emitClose(): void {
  for (const callback of closeHandlers) {
    callback();
  }
}

afterEach(() => {
  mock.restore();
});

describe("presentation/input", () => {
  test("startInput abre una sola interfaz y no la duplica", () => {
    input.startInput();
    const opened = createdInterfaces;

    input.startInput();
    expect(createdInterfaces).toBe(opened);
  });

  test("prompt escribe el mensaje y devuelve la línea leída", async () => {
    const prompts = capturePrompts();
    input.startInput();

    const pending = input.prompt("  Nombre de la ciudad: ");
    expect(prompts()).toBe("  Nombre de la ciudad: ");

    typeLine("Ottawa");
    expect(await pending).toBe("Ottawa");
  });

  test("prompt recorta los espacios de la línea leída", async () => {
    capturePrompts();
    input.startInput();

    const pending = input.prompt("  ");
    typeLine("   Ottawa   ");
    expect(await pending).toBe("Ottawa");
  });

  test("prompt consume las líneas leídas antes, en orden", async () => {
    capturePrompts();
    input.startInput();

    typeLine("primera");
    typeLine("segunda");

    expect(await input.prompt("  ")).toBe("primera");
    expect(await input.prompt("  ")).toBe("segunda");
  });

  test("promptRequired insiste mientras la respuesta venga vacía", async () => {
    const out = captureOutput();
    capturePrompts();
    input.startInput();

    const pending = input.promptRequired("  Nombre: ");
    typeLine("   ");
    typeLine("");
    typeLine("Ottawa");

    expect(await pending).toBe("Ottawa");
    expect(out.count("! Escribí algo, o Ctrl+C para salir.")).toBe(2);
  });

  test("confirm acepta las respuestas afirmativas y rechaza las demás", async () => {
    capturePrompts();
    input.startInput();

    for (const answer of ["s", "S", "si", "sí", "SÍ", "y"]) {
      const pending = input.confirm("  ¿Seguir? ");
      typeLine(answer);
      expect(await pending).toBe(true);
    }

    for (const answer of ["", "n", "no", "0", "claro"]) {
      const pending = input.confirm("  ¿Seguir? ");
      typeLine(answer);
      expect(await pending).toBe(false);
    }
  });
});

describe("presentation/input al cerrar la entrada por teclado", () => {
  test("el prompt pendiente se resuelve con la línea vacía", async () => {
    capturePrompts();
    input.startInput();

    const pending = input.prompt("  ");
    emitClose();

    expect(await pending).toBe("");
  });

  test("promptRequired pendiente lanza el error de fin de entrada", async () => {
    captureOutput();
    capturePrompts();
    input.startInput();

    const pending = input.promptRequired("  Nombre: ");
    emitClose();

    await expect(pending).rejects.toThrow("se terminó la entrada por teclado");
  });

  test("confirm posterior al cierre se rechaza sin esperar una línea", async () => {
    capturePrompts();
    input.closeInput();
    input.startInput();

    await expect(input.confirm("  ¿Seguir? ")).rejects.toThrow(
      "se terminó la entrada por teclado",
    );
  });

  test("closeInput cierra la interfaz y permite reiniciarla", () => {
    input.closeInput();
    const before = createdInterfaces;

    input.startInput();
    expect(createdInterfaces).toBe(before + 1);
  });
});
