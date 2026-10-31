import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sans `globals: true`, Testing Library ne démonte pas les rendus entre deux tests.
afterEach(cleanup);

// jsdom n'implémente pas IntersectionObserver (utilisé par les apparitions au défilement).
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver ??=
  IntersectionObserverStub as unknown as typeof IntersectionObserver;
