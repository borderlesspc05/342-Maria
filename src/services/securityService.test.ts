import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePositiveNumber,
  validateRequiredString,
  validateRole,
} from "./securityService";

describe("securityService validations", () => {
  it("valida string obrigatória", () => {
    expect(validateRequiredString("  Maria  ", "Nome", 2, 20)).toBe("Maria");
    expect(() => validateRequiredString("", "Nome")).toThrow("Nome é obrigatório");
  });

  it("valida e-mail", () => {
    expect(validateEmail("ADMIN@EMPRESA.COM")).toBe("admin@empresa.com");
    expect(() => validateEmail("email-invalido")).toThrow("E-mail inválido");
  });

  it("valida role", () => {
    expect(validateRole("admin")).toBe("admin");
    expect(() => validateRole("superadmin")).toThrow("Role inválida");
  });

  it("valida número positivo", () => {
    expect(validatePositiveNumber("10.5", "Valor")).toBe(10.5);
    expect(() => validatePositiveNumber(0, "Valor")).toThrow("Valor deve ser maior que zero");
  });
});
