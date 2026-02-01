# Replace MapMyIndia with OpenStreetMap (Nominatim)

The MapMyIndia integration is proving unreliable due to API key or loading issues. Since you need a working location search immediately, I will replace it with **OpenStreetMap (Nominatim)**. This is a free, open-source alternative that doesn't require an API key for basic usage.

## Implementation Plan

1.  **Modify `MapplsLocationInput.tsx`**:
    *   Rename component to `LocationSearchInput` (or keep name for compatibility but change internals).
    *   Remove all MapMyIndia script loading logic.
    *   Implement a standard React state-controlled input.
    *   Add a debounced search function that calls the **Nominatim API** (`https://nominatim.openstreetmap.org/search`).
    *   Display a dropdown of search results (suggestions).
    *   When a user clicks a suggestion, capture the `lat`, `lon`, and `display_name`.

2.  **Update Dependencies**:
    *   No new packages needed (we can use standard `fetch`).
    *   We might use `lodash.debounce` if available, or write a simple debounce hook.

3.  **Verify Integration**:
    *   This change will automatically fix the "Service Request" and "Admin Centers" pages since they both use this component.

## Why this is better
*   **No API Key**: Works out of the box.
*   **Reliable**: Standard REST API, no complex script injection.
*   **Free**: Good for development and low-volume production.

I will now rewrite the `MapplsLocationInput.tsx` file to use OpenStreetMap.