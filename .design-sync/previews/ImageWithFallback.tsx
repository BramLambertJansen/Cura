import { ImageWithFallback } from 'cura';

// An <img> that swaps to a neutral placeholder panel when its source fails —
// so a missing room photo never leaves a broken-image glyph in a card. One
// cell shows a real (inline data-URI) image loading; the other points at a
// missing file to show the graceful fallback panel.
const WORKING =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMTYwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InMiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNFQUYwRTYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGNkYxRTciLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE2MCIgZmlsbD0idXJsKCNzKSIvPjxjaXJjbGUgY3g9IjE4NiIgY3k9IjUwIiByPSIyNiIgZmlsbD0iI0U4QzlBOCIvPjxwYXRoIGQ9Ik0wIDEyOCBRNjAgOTYgMTIwIDEyMCBUMjQwIDExNCBWMTYwIEgwIFoiIGZpbGw9IiM4QUE2N0YiLz48cGF0aCBkPSJNMCAxNDYgUTcwIDEyMCAxNDAgMTQwIFQyNDAgMTM2IFYxNjAgSDAgWiIgZmlsbD0iIzZFOEM2NCIvPjwvc3ZnPg==';

export function Geladen() {
  return (
    <ImageWithFallback
      src={WORKING}
      alt="Ochtendlicht in de woonkamer"
      className="rounded-xl object-cover"
      style={{ width: 240, height: 160 }}
    />
  );
}

export function Terugval() {
  return (
    <ImageWithFallback
      src="/kamers/zolder-nog-geen-foto.jpg"
      alt="Zolder"
      className="rounded-xl"
      style={{ width: 240, height: 160 }}
    />
  );
}
