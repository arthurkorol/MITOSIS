/**
 * Ввод: указатель (мышь/тач) в CSS-пикселях экрана.
 * Мышь ведёт клетку всегда («наведи и плыви»), тач — пока палец на экране
 * и в последнюю точку после отпускания.
 */
export class Input {
  pointerX = 0;
  pointerY = 0;
  /** Пока false — прицела нет, клетка стоит на месте. */
  pointerActive = false;

  attach(el: HTMLElement): void {
    el.addEventListener('pointermove', this.onPointer);
    el.addEventListener('pointerdown', this.onPointer);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private readonly onPointer = (e: PointerEvent): void => {
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    this.pointerActive = true;
  };
}
