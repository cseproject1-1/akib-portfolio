import { useState, useCallback } from 'react';
import { Delete } from 'lucide-react';

const AppCalculator = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDot = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const backspace = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display]);

  const toggleSign = useCallback(() => {
    const val = parseFloat(display);
    setDisplay(String(-val));
  }, [display]);

  const inputPercent = useCallback(() => {
    const val = parseFloat(display);
    setDisplay(String(val / 100));
  }, [display]);

  const performOperation = useCallback((nextOp: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue;
      let result: number;

      switch (operation) {
        case '+': result = currentValue + inputValue; break;
        case '-': result = currentValue - inputValue; break;
        case '×': result = currentValue * inputValue; break;
        case '÷': result = inputValue !== 0 ? currentValue / inputValue : 0; break;
        default: result = inputValue;
      }

      if (nextOp === '=') {
        const expr = `${currentValue} ${operation} ${inputValue} = ${result}`;
        setHistory(prev => [expr, ...prev].slice(0, 10));
      }

      setPreviousValue(result);
      setDisplay(String(result));
    }

    setWaitingForOperand(true);
    setOperation(nextOp === '=' ? null : nextOp);
    if (nextOp === '=') setPreviousValue(null);
  }, [display, previousValue, operation]);

  const buttons = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '⌫', '='],
  ];

  const handleButton = (btn: string) => {
    if (btn >= '0' && btn <= '9') inputDigit(btn);
    else if (btn === '.') inputDot();
    else if (btn === 'C') clearAll();
    else if (btn === '±') toggleSign();
    else if (btn === '%') inputPercent();
    else if (btn === '⌫') backspace();
    else performOperation(btn);
  };

  const isOperator = (btn: string) => ['+', '-', '×', '÷'].includes(btn);
  const isActiveOp = (btn: string) => operation === btn && waitingForOperand;

  return (
    <div className="flex flex-col h-full bg-os-window-body">
      {/* Display */}
      <div className="p-4 flex flex-col items-end justify-end min-h-[100px]">
        {previousValue !== null && operation && (
          <div className="text-xs text-os-window-body-foreground/40 mb-1">
            {previousValue} {operation}
          </div>
        )}
        <div className="text-3xl font-light text-os-window-body-foreground tracking-tight truncate w-full text-right">
          {display}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex-1 grid grid-cols-4 gap-px p-2">
        {buttons.flat().map((btn, i) => {
          const isOp = isOperator(btn);
          const isEquals = btn === '=';
          const isZero = btn === '0';
          const isFunc = ['C', '±', '%'].includes(btn);

          return (
            <button
              key={i}
              onClick={() => handleButton(btn)}
              className={`
                flex items-center justify-center text-lg font-medium rounded-lg transition-all active:scale-95
                ${isEquals ? 'bg-os-accent text-white hover:bg-os-accent/80' : ''}
                ${isOp && !isEquals ? (isActiveOp(btn) ? 'bg-white text-os-accent' : 'bg-os-accent/20 text-os-accent hover:bg-os-accent/30') : ''}
                ${isFunc ? 'bg-white/10 text-os-window-body-foreground hover:bg-white/15' : ''}
                ${!isOp && !isFunc && !isEquals ? 'bg-white/5 text-os-window-body-foreground hover:bg-white/10' : ''}
                ${btn === '⌫' ? 'bg-white/5 text-os-window-body-foreground hover:bg-white/10' : ''}
                h-12
              `}
            >
              {btn === '⌫' ? <Delete size={18} /> : btn}
            </button>
          );
        })}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border-t border-os-panel-border p-2 max-h-24 overflow-auto">
          <div className="text-[9px] text-os-window-body-foreground/30 mb-1 uppercase tracking-wider">History</div>
          {history.map((h, i) => (
            <div key={i} className="text-[10px] text-os-window-body-foreground/50 py-0.5">{h}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppCalculator;
