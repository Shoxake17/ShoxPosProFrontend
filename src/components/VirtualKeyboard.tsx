// // src/components/VirtualKeyboard.tsx
// import React, { useState, useEffect, useCallback, useRef } from "react";

// type KeyboardLayout = "default" | "shift" | "numbers" | "symbols";

// interface Key {
//   label: string;
//   value?: string;
//   action?:
//     | "backspace" | "enter" | "space" | "shift"
//     | "numbers" | "symbols" | "default" | "close"
//     | "left" | "right";
//   width?: number;
// }

// const LAYOUTS: Record<KeyboardLayout, Key[][]> = {
//   default: [
//     [
//       { label: "q" }, { label: "w" }, { label: "e" }, { label: "r" },
//       { label: "t" }, { label: "y" }, { label: "u" }, { label: "i" },
//       { label: "o" }, { label: "p" },
//     ],
//     [
//       { label: "a" }, { label: "s" }, { label: "d" }, { label: "f" },
//       { label: "g" }, { label: "h" }, { label: "j" }, { label: "k" },
//       { label: "l" },
//     ],
//     [
//       { label: "⇧", action: "shift", width: 1.5 },
//       { label: "z" }, { label: "x" }, { label: "c" }, { label: "v" },
//       { label: "b" }, { label: "n" }, { label: "m" },
//       { label: "⌫", action: "backspace", width: 1.5 },
//     ],
//     [
//       { label: "123", action: "numbers", width: 1.5 },
//       { label: "◁", action: "left" },
//       { label: "SPACE", action: "space", value: " ", width: 5 },
//       { label: "▷", action: "right" },
//       { label: "↵", action: "enter", width: 1.5 },
//     ],
//   ],
//   shift: [
//     [
//       { label: "Q" }, { label: "W" }, { label: "E" }, { label: "R" },
//       { label: "T" }, { label: "Y" }, { label: "U" }, { label: "I" },
//       { label: "O" }, { label: "P" },
//     ],
//     [
//       { label: "A" }, { label: "S" }, { label: "D" }, { label: "F" },
//       { label: "G" }, { label: "H" }, { label: "J" }, { label: "K" },
//       { label: "L" },
//     ],
//     [
//       { label: "⇧", action: "shift", width: 1.5 },
//       { label: "Z" }, { label: "X" }, { label: "C" }, { label: "V" },
//       { label: "B" }, { label: "N" }, { label: "M" },
//       { label: "⌫", action: "backspace", width: 1.5 },
//     ],
//     [
//       { label: "123", action: "numbers", width: 1.5 },
//       { label: "◁", action: "left" },
//       { label: "SPACE", action: "space", value: " ", width: 5 },
//       { label: "▷", action: "right" },
//       { label: "↵", action: "enter", width: 1.5 },
//     ],
//   ],
//   numbers: [
//     [
//       { label: "1" }, { label: "2" }, { label: "3" }, { label: "4" },
//       { label: "5" }, { label: "6" }, { label: "7" }, { label: "8" },
//       { label: "9" }, { label: "0" },
//     ],
//     [
//       { label: "-" }, { label: "/" }, { label: ":" }, { label: ";" },
//       { label: "(" }, { label: ")" }, { label: "$" }, { label: "&" },
//       { label: "@" }, { label: '"' },
//     ],
//     [
//       { label: "#+=", action: "symbols", width: 1.5 },
//       { label: "." }, { label: "," }, { label: "?" }, { label: "!" },
//       { label: "'" }, { label: "%" }, { label: "^" },
//       { label: "⌫", action: "backspace", width: 1.5 },
//     ],
//     [
//       { label: "ABC", action: "default", width: 1.5 },
//       { label: "◁", action: "left" },
//       { label: "SPACE", action: "space", value: " ", width: 5 },
//       { label: "▷", action: "right" },
//       { label: "↵", action: "enter", width: 1.5 },
//     ],
//   ],
//   symbols: [
//     [
//       { label: "[" }, { label: "]" }, { label: "{" }, { label: "}" },
//       { label: "#" }, { label: "%" }, { label: "^" }, { label: "*" },
//       { label: "+" }, { label: "=" },
//     ],
//     [
//       { label: "_" }, { label: "\\" }, { label: "|" }, { label: "~" },
//       { label: "<" }, { label: ">" }, { label: "€" }, { label: "£" },
//       { label: "¥" }, { label: "•" },
//     ],
//     [
//       { label: "123", action: "numbers", width: 1.5 },
//       { label: "." }, { label: "," }, { label: "?" }, { label: "!" },
//       { label: "'" }, { label: "`" }, { label: "…" },
//       { label: "⌫", action: "backspace", width: 1.5 },
//     ],
//     [
//       { label: "ABC", action: "default", width: 1.5 },
//       { label: "◁", action: "left" },
//       { label: "SPACE", action: "space", value: " ", width: 5 },
//       { label: "▷", action: "right" },
//       { label: "↵", action: "enter", width: 1.5 },
//     ],
//   ],
// };

// // React synthetic event'larni bypass qilish uchun native setter
// function setNativeValue(
//   el: HTMLInputElement | HTMLTextAreaElement,
//   value: string
// ) {
//   const proto =
//     el.tagName === "INPUT"
//       ? window.HTMLInputElement.prototype
//       : window.HTMLTextAreaElement.prototype;
//   const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
//   if (setter) setter.call(el, value);
//   el.dispatchEvent(new Event("input", { bubbles: true }));
//   el.dispatchEvent(new Event("change", { bubbles: true }));
// }

// // ─────────────────────────────────────────────
// // ASOSIY COMPONENT
// // ─────────────────────────────────────────────
// interface VirtualKeyboardProps {
//   theme?: "dark" | "light";
// }

// const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ theme = "dark" }) => {
//   const [isVisible, setIsVisible] = useState(false);
//   const [layout, setLayout] = useState<KeyboardLayout>("default");
//   const [pressedKey, setPressedKey] = useState<string | null>(null);

//   // activeInput ni STATE'de emas, faqat REF'de saqlaymiz
//   // (state update klaviatura bosishida lag beradi)
//   const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
//   const containerRef = useRef<HTMLDivElement | null>(null);
//   const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const isDark = theme === "dark";

//   // ─── FOCUS LISTENER — capture fazasida ushlaydi ──────────────────────────
//   useEffect(() => {
//     const SKIP_TYPES = ["file", "color", "range", "date", "time", "datetime-local", "month", "week"];

//     const onFocus = (e: FocusEvent) => {
//       const target = e.target as HTMLElement;

//       // Keyboard container ichidagi elementlarga react qilmaymiz
//       if (containerRef.current?.contains(target)) return;

//       if (
//         target instanceof HTMLInputElement ||
//         target instanceof HTMLTextAreaElement
//       ) {
//         if ((target as any).dataset?.noVirtualKeyboard === "true") return;
//         if (target instanceof HTMLInputElement && SKIP_TYPES.includes(target.type)) return;

//         // ✅ Asosiy fix: to'g'ridan-to'g'ri ref'ga yozamiz, state yangilamaymiz
//         activeInputRef.current = target;
//         setIsVisible(true);
//       }
//     };

//     const onBlur = (e: FocusEvent) => {
//       const related = e.relatedTarget as HTMLElement | null;

//       // Keyboard o'ziga focus ketsa — yopmaymiz
//       if (containerRef.current?.contains(related)) return;

//       // Boshqa input/textarea ga ketsa — yopmaymiz (onFocus yangilaydi)
//       if (
//         related instanceof HTMLInputElement ||
//         related instanceof HTMLTextAreaElement
//       ) return;

//       // Hech narsaga ketmasa — kechiktirish bilan tekshiramiz
//       setTimeout(() => {
//         const active = document.activeElement;

//         if (containerRef.current?.contains(active)) return;

//         if (
//           active instanceof HTMLInputElement ||
//           active instanceof HTMLTextAreaElement
//         ) {
//           activeInputRef.current = active;
//           setIsVisible(true);
//           return;
//         }

//         // Hech qanday input yo'q — yopamiz
//         setIsVisible(false);
//         activeInputRef.current = null;
//       }, 120);
//     };

//     // ✅ capture: true — React'dan OLDIN ishlaydi
//     document.addEventListener("focus", onFocus, true);
//     document.addEventListener("blur", onBlur, true);

//     return () => {
//       document.removeEventListener("focus", onFocus, true);
//       document.removeEventListener("blur", onBlur, true);
//     };
//   }, []);
//     //  Keyboard ko'rinishi o'zgarganda, balandligini yangilash uchun event yuboramiz
//   useEffect(() => {
//   if (isVisible) {
//     const timer = setTimeout(() => {
//       const height = containerRef.current?.offsetHeight ?? 320;
//       window.dispatchEvent(
//         new CustomEvent('virtualKeyboardHeight', { detail: { height } })
//       );
//     }, 50);
//     return () => clearTimeout(timer);
//   } else {
//     window.dispatchEvent(
//       new CustomEvent('virtualKeyboardHeight', { detail: { height: 0 } })
//     );
//   }
// }, [isVisible]);

//   // isVisible false bo'lganda layoutni reset
//   useEffect(() => {
//     if (!isVisible) setLayout("default");
//   }, [isVisible]);

//   // ─── CLOSE ───────────────────────────────────────────────────────────────
//   const close = useCallback(() => {
//     setIsVisible(false);
//     activeInputRef.current = null;
//     (document.activeElement as HTMLElement)?.blur?.();
//   }, []);

//   // ─── KEY HANDLER ─────────────────────────────────────────────────────────
//   const handleKey = useCallback(
//     (key: Key) => {
//       const input = activeInputRef.current;
//       if (!input || !document.body.contains(input)) {
//         setIsVisible(false);
//         activeInputRef.current = null;
//         return;
//       }

//       // Focus ni qaytaramiz
//       if (document.activeElement !== input) input.focus();

//       const start = input.selectionStart ?? input.value.length;
//       const end   = input.selectionEnd   ?? input.value.length;
//       const val   = input.value;

//       if (key.action) {
//         switch (key.action) {
//           case "backspace": {
//             if (start !== end) {
//               const nv = val.slice(0, start) + val.slice(end);
//               setNativeValue(input, nv);
//               requestAnimationFrame(() => input.setSelectionRange(start, start));
//             } else if (start > 0) {
//               const nv = val.slice(0, start - 1) + val.slice(start);
//               setNativeValue(input, nv);
//               requestAnimationFrame(() => input.setSelectionRange(start - 1, start - 1));
//             }
//             break;
//           }
//           case "enter": {
//             if (input instanceof HTMLTextAreaElement) {
//               const nv = val.slice(0, start) + "\n" + val.slice(end);
//               setNativeValue(input, nv);
//               requestAnimationFrame(() => input.setSelectionRange(start + 1, start + 1));
//             } else {
//               input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
//               input.dispatchEvent(new KeyboardEvent("keyup",   { key: "Enter", bubbles: true }));
//               input.closest("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
//             }
//             break;
//           }
//           case "space": {
//             const nv = val.slice(0, start) + " " + val.slice(end);
//             setNativeValue(input, nv);
//             requestAnimationFrame(() => input.setSelectionRange(start + 1, start + 1));
//             break;
//           }
//           case "shift":
//             setLayout(prev => (prev === "shift" ? "default" : "shift"));
//             break;
//           case "numbers":  setLayout("numbers");  break;
//           case "symbols":  setLayout("symbols");  break;
//           case "default":  setLayout("default");  break;
//           case "close":    close(); break;
//           case "left": {
//             const np = Math.max(0, start - 1);
//             requestAnimationFrame(() => { input.focus(); input.setSelectionRange(np, np); });
//             break;
//           }
//           case "right": {
//             const np = Math.min(val.length, start + 1);
//             requestAnimationFrame(() => { input.focus(); input.setSelectionRange(np, np); });
//             break;
//           }
//         }
//         return;
//       }

//       // Oddiy belgi
//       const char = key.value ?? key.label;
//       const nv = val.slice(0, start) + char + val.slice(end);
//       setNativeValue(input, nv);
//       requestAnimationFrame(() => {
//         input.focus();
//         input.setSelectionRange(start + char.length, start + char.length);
//       });

//       if (layout === "shift") setLayout("default");
//     },
//     [layout, close]
//   );

//   // ─── HOLD TO REPEAT ───────────────────────────────────────────────────────
//   const startHold = (key: Key) => {
//     handleKey(key);
//     setPressedKey(key.label);
//     if (["backspace", "left", "right"].includes(key.action ?? "")) {
//       holdTimeoutRef.current = setTimeout(() => {
//         holdIntervalRef.current = setInterval(() => handleKey(key), 60);
//       }, 350);
//     }
//   };

//   const endHold = () => {
//     setPressedKey(null);
//     if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
//     if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
//   };

//   // ─── RENDER ───────────────────────────────────────────────────────────────
//   if (!isVisible) return null;

//   const bg         = isDark ? "#0d1526"               : "#f0f4fa";
//   const keyBg      = isDark ? "#1a2540"               : "#ffffff";
//   const border     = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)";
//   const textColor  = isDark ? "#e2e8f0"               : "#1a202c";
//   const specialBg  = isDark ? "#232f47"               : "#dce3ef";
//   const specialTxt = isDark ? "#7c8faa"               : "#64748b";
//   const accentBg   = "#2563eb";
//   const pressedBg  = "#3b82f6";

//   return (
//     <>
//       {/* Backdrop */}
//       <div
//         onMouseDown={(e) => { e.preventDefault(); close(); }}
//         onTouchStart={(e) => { e.preventDefault(); close(); }}
//         style={{ position: "fixed", inset: 0, zIndex: 99990, background: "transparent" }}
//       />

//       {/* Keyboard panel */}
//       <div
//         ref={containerRef}
//         onMouseDown={(e) => e.preventDefault()}
//         onTouchStart={(e) => e.stopPropagation()}
//         style={{
//           position: "fixed",
//           bottom: 0, left: 0, right: 0,
//           zIndex: 99999,
//           background: bg,
//           borderTop: `1px solid ${border}`,
//           borderRadius: "18px 18px 0 0",
//           padding: "10px 6px 20px",
//           boxShadow: `0 -6px 32px rgba(0,0,0,${isDark ? "0.55" : "0.12"})`,
//           userSelect: "none",
//           backdropFilter: "blur(24px)",
//           WebkitBackdropFilter: "blur(24px)",
//           animation: "vkSlideUp 0.2s cubic-bezier(0.34, 1.4, 0.64, 1)",
//         }}
//       >
//         {/* Handle + X */}
//         <div style={{
//           display: "flex", justifyContent: "center", alignItems: "center",
//           marginBottom: 8, position: "relative",
//         }}>
//           <div style={{
//             width: 36, height: 4, borderRadius: 2,
//             background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
//           }} />
//           <button
//             onMouseDown={(e) => { e.preventDefault(); close(); }}
//             onTouchStart={(e) => { e.preventDefault(); close(); }}
//             style={{
//               position: "absolute", right: 6, top: -4,
//               width: 26, height: 26, borderRadius: "50%",
//               border: "none", cursor: "pointer",
//               background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
//               color: specialTxt,
//               display: "flex", alignItems: "center", justifyContent: "center",
//               fontSize: 15, lineHeight: 1,
//             }}
//           >×</button>
//         </div>

//         {/* Rows */}
//         {LAYOUTS[layout].map((row, ri) => (
//           <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 4 }}>
//             {row.map((key, ki) => {
//               const isPressed   = pressedKey === key.label;
//               const isEnter     = key.action === "enter";
//               const isBackspace = key.action === "backspace";
//               const isShiftOn   = key.action === "shift" && layout === "shift";
//               const isSpecial   = !!key.action && key.action !== "space" && !isEnter && !isBackspace;

//               let bg2    = keyBg;
//               let color2 = textColor;
//               let fSize  = "15px";
//               let fWeight: number | string = 500;

//               if (isSpecial)   { bg2 = specialBg;  color2 = specialTxt; fSize = "12px"; fWeight = 600; }
//               if (isEnter)     { bg2 = accentBg;   color2 = "#fff";     fSize = "17px"; }
//               if (isBackspace) { bg2 = specialBg;  color2 = textColor;  fSize = "17px"; }
//               if (isShiftOn)   { bg2 = accentBg;   color2 = "#fff"; }
//               if (isPressed)   { bg2 = pressedBg;  color2 = "#fff"; }

//               return (
//                 <button
//                   key={ki}
//                   onMouseDown={(e) => { e.preventDefault(); startHold(key); }}
//                   onMouseUp={endHold}
//                   onMouseLeave={endHold}
//                   onTouchStart={(e) => { e.preventDefault(); startHold(key); }}
//                   onTouchEnd={(e)   => { e.preventDefault(); endHold(); }}
//                   style={{
//                     flex: key.width ?? 1,
//                     minWidth: key.action === "space" ? undefined : 28,
//                     height: 42,
//                     borderRadius: 9,
//                     border: `1px solid ${border}`,
//                     background: bg2,
//                     color: color2,
//                     fontSize: key.action === "space" ? "11px" : fSize,
//                     fontWeight: fWeight,
//                     cursor: "pointer",
//                     display: "flex", alignItems: "center", justifyContent: "center",
//                     transition: "background 0.07s, transform 0.05s",
//                     transform: isPressed ? "scale(0.9)" : "scale(1)",
//                     boxShadow: isPressed ? "none" : `0 1px 3px rgba(0,0,0,${isDark ? "0.25" : "0.07"})`,
//                     fontFamily: "-apple-system, system-ui, sans-serif",
//                     WebkitTapHighlightColor: "transparent",
//                     outline: "none", padding: 0,
//                   }}
//                 >
//                   {key.label}
//                 </button>
//               );
//             })}
//           </div>
//         ))}
//       </div>

//       <style>{`
//         @keyframes vkSlideUp {
//           from { transform: translateY(100%); opacity: 0; }
//           to   { transform: translateY(0);    opacity: 1; }
//         }
//       `}</style>
//     </>
//   );
// };

// export default VirtualKeyboard;
