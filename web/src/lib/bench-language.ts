/**
 * Monaco Editor language definition for .bench circuit files
 * Provides syntax highlighting, auto-completion, and validation for Atalanta circuit files
 */

import type { languages, editor } from 'monaco-editor';

// Language configuration
export const benchLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: '#',
  },
  brackets: [
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '(', close: ')' },
  ],
  surroundingPairs: [
    { open: '(', close: ')' },
  ],
  wordPattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
};

// Language registration
export const benchLanguageRegistration = {
  id: 'bench',
  extensions: ['.bench'],
  aliases: ['Bench', 'bench', 'Circuit'],
  mimetypes: ['text/bench', 'application/bench'],
};

// Enhanced tokenizer with better pattern recognition
export const benchLanguageTokens: languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  tokenPostfix: '.bench',
  
  keywords: [
    'INPUT', 'OUTPUT'
  ],
  
  gates: [
    'AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 
    'BUFF', 'BUF', 'BUFFER'
  ],
  
  operators: ['='],
  
  // Define token patterns
  tokenizer: {
    root: [
      // Comments - highest priority
      [/#.*$/, 'comment'],
      
      // INPUT/OUTPUT declarations with parentheses
      [/\b(INPUT|OUTPUT)\s*\(/, { cases: { 
        '$1': { token: 'keyword.control', next: '@signal_declaration' }
      }}],
      
      // Gate types - case insensitive
      [/\b(AND|OR|NOT|NAND|NOR|XOR|XNOR|BUFF?|BUFFER)\b/i, 'keyword.gate'],
      
      // Signal names and identifiers
      [/[a-zA-Z_][a-zA-Z0-9_]*/, {
        cases: {
          '@keywords': 'keyword.control',
          '@gates': 'keyword.gate',
          '@default': 'identifier'
        }
      }],
      
      // Numbers
      [/\d+/, 'number'],
      
      // Assignment operator
      [/=/, 'operator.assignment'],
      
      // Parentheses for gate inputs
      [/\(/, { token: 'delimiter.parenthesis', next: '@gate_inputs' }],
      [/\)/, 'delimiter.parenthesis'],
      
      // Comma separator
      [/,/, 'delimiter.comma'],
      
      // Whitespace
      [/\s+/, 'white'],
      
      // Invalid characters
      [/./, 'invalid'],
    ],
    
    // State for signal declarations (INPUT/OUTPUT)
    signal_declaration: [
      [/[a-zA-Z_][a-zA-Z0-9_]*/, 'variable.name'],
      [/\)/, { token: 'delimiter.parenthesis', next: '@pop' }],
      [/\s+/, 'white'],
      [/./, 'invalid'],
    ],
    
    // State for gate input parameters
    gate_inputs: [
      [/[a-zA-Z_][a-zA-Z0-9_]*/, 'variable.parameter'],
      [/,/, 'delimiter.comma'],
      [/\s+/, 'white'],
      [/\)/, { token: 'delimiter.parenthesis', next: '@pop' }],
      [/./, 'invalid'],
    ],
  },
};

// Enhanced theme with better color coding
export const benchTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    
    // Keywords (INPUT/OUTPUT)
    { token: 'keyword.control', foreground: 'C586C0', fontStyle: 'bold' },
    
    // Gate types
    { token: 'keyword.gate', foreground: '4FC1FF', fontStyle: 'bold' },
    
    // Identifiers and signal names
    { token: 'identifier', foreground: '9CDCFE' },
    { token: 'variable.name', foreground: '4EC9B0', fontStyle: 'bold' },
    { token: 'variable.parameter', foreground: '9CDCFE' },
    
    // Numbers
    { token: 'number', foreground: 'B5CEA8' },
    
    // Operators and delimiters
    { token: 'operator.assignment', foreground: 'D4D4D4', fontStyle: 'bold' },
    { token: 'delimiter.parenthesis', foreground: 'FFD700' },
    { token: 'delimiter.comma', foreground: 'D4D4D4' },
    
    // Invalid tokens
    { token: 'invalid', foreground: 'F44747', fontStyle: 'underline' },
  ],
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#cccccc',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#cccccc',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#3a3d41',
    'editorCursor.foreground': '#aeafad',
    'editor.findMatchBackground': '#515c6a',
    'editor.findMatchHighlightBackground': '#ea5c0055',
  }
};

// Enhanced auto-completion items
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBenchCompletionItems = (monaco: any) => [
  // Gate types with detailed descriptions
  {
    label: 'AND',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'AND',
    detail: 'AND gate - outputs 1 only when all inputs are 1',
    documentation: 'Logical AND operation: output = input1 & input2 & ... & inputN'
  },
  {
    label: 'OR',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'OR',
    detail: 'OR gate - outputs 1 when any input is 1',
    documentation: 'Logical OR operation: output = input1 | input2 | ... | inputN'
  },
  {
    label: 'NOT',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'NOT',
    detail: 'NOT gate - inverts the input',
    documentation: 'Logical NOT operation: output = !input'
  },
  {
    label: 'NAND',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'NAND',
    detail: 'NAND gate - outputs 0 only when all inputs are 1',
    documentation: 'Logical NAND operation: output = !(input1 & input2 & ... & inputN)'
  },
  {
    label: 'NOR',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'NOR',
    detail: 'NOR gate - outputs 0 when any input is 1',
    documentation: 'Logical NOR operation: output = !(input1 | input2 | ... | inputN)'
  },
  {
    label: 'XOR',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'XOR',
    detail: 'XOR gate - outputs 1 when odd number of inputs are 1',
    documentation: 'Logical XOR operation: output = input1 ^ input2 ^ ... ^ inputN'
  },
  {
    label: 'XNOR',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'XNOR',
    detail: 'XNOR gate - outputs 1 when even number of inputs are 1',
    documentation: 'Logical XNOR operation: output = !(input1 ^ input2 ^ ... ^ inputN)'
  },
  {
    label: 'BUFF',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'BUFF',
    detail: 'Buffer gate - passes input to output unchanged',
    documentation: 'Buffer operation: output = input'
  },
  {
    label: 'BUF',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'BUF',
    detail: 'Buffer gate - passes input to output unchanged',
    documentation: 'Buffer operation: output = input'
  },
  
  // Keywords
  {
    label: 'INPUT',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'INPUT',
    detail: 'Input signal declaration',
    documentation: 'Declares a primary input signal to the circuit'
  },
  {
    label: 'OUTPUT',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'OUTPUT',
    detail: 'Output signal declaration',
    documentation: 'Declares a primary output signal from the circuit'
  },
  
  // Snippets for common patterns
  {
    label: 'INPUT declaration',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: 'INPUT(${1:signal_name})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Input signal declaration template',
    documentation: 'Template for declaring a primary input signal'
  },
  {
    label: 'OUTPUT declaration',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: 'OUTPUT(${1:signal_name})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Output signal declaration template',
    documentation: 'Template for declaring a primary output signal'
  },
  {
    label: 'Gate assignment',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: '${1:output_signal} = ${2|AND,OR,NOT,NAND,NOR,XOR,XNOR,BUFF,BUF|}(${3:input_signals})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Gate assignment template',
    documentation: 'Template for assigning a gate output to a signal'
  },
  {
    label: 'Multi-input gate',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: '${1:output} = ${2|AND,OR,NAND,NOR,XOR,XNOR|}(${3:input1}, ${4:input2}${5:, ${6:input3}})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Multi-input gate template',
    documentation: 'Template for gates with multiple inputs'
  },
  {
    label: 'Single-input gate',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: '${1:output} = ${2|NOT,BUFF,BUF|}(${3:input})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Single-input gate template',
    documentation: 'Template for gates with single input'
  },
  {
    label: 'Comment block',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: '# ${1:Description}\n# ${2:Additional details}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Comment block template',
    documentation: 'Template for adding comments to the circuit'
  },
];

// Validation and diagnostics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateBenchSyntax = (model: any, monaco: any): editor.IMarkerData[] => {
  const markers: editor.IMarkerData[] = [];
  const content = model.getValue();
  const lines = content.split('\n');
  
  lines.forEach((line: string, lineIndex: number) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    
    // Check INPUT/OUTPUT declarations
    const inputOutputMatch = trimmedLine.match(/^(INPUT|OUTPUT)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i);
    if (trimmedLine.match(/^(INPUT|OUTPUT)/i) && !inputOutputMatch) {
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: lineIndex + 1,
        startColumn: 1,
        endLineNumber: lineIndex + 1,
        endColumn: line.length + 1,
        message: 'Invalid INPUT/OUTPUT declaration. Expected format: INPUT(signal_name) or OUTPUT(signal_name)',
      });
      return;
    }
    
    // Check gate assignments
    const gateAssignmentMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(AND|OR|NOT|NAND|NOR|XOR|XNOR|BUFF?|BUFFER)\s*\(/i);
    if (trimmedLine.includes('=') && !gateAssignmentMatch) {
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: lineIndex + 1,
        startColumn: 1,
        endLineNumber: lineIndex + 1,
        endColumn: line.length + 1,
        message: 'Invalid gate assignment. Expected format: signal_name = GATE_TYPE(inputs)',
      });
      return;
    }
    
    // Check for unmatched parentheses
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: lineIndex + 1,
        startColumn: 1,
        endLineNumber: lineIndex + 1,
        endColumn: line.length + 1,
        message: 'Unmatched parentheses in line',
      });
    }
    
    // Check for invalid characters in signal names
    const signalNames = line.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
    if (signalNames) {
      signalNames.forEach(name => {
        if (name.match(/^\d/)) {
          const startCol = line.indexOf(name) + 1;
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: lineIndex + 1,
            startColumn: startCol,
            endLineNumber: lineIndex + 1,
            endColumn: startCol + name.length,
            message: 'Signal names should not start with numbers',
          });
        }
      });
    }
  });
  
  return markers;
};

// Hover provider for additional information
export const getBenchHoverProvider = (): languages.HoverProvider => ({
  provideHover: (model, position) => {
    const word = model.getWordAtPosition(position);
    if (!word) return null;
    
    const gateDescriptions: { [key: string]: string } = {
      'AND': 'AND gate: Outputs 1 only when all inputs are 1\nTruth table: 0&0=0, 0&1=0, 1&0=0, 1&1=1',
      'OR': 'OR gate: Outputs 1 when any input is 1\nTruth table: 0|0=0, 0|1=1, 1|0=1, 1|1=1',
      'NOT': 'NOT gate: Inverts the input\nTruth table: !0=1, !1=0',
      'NAND': 'NAND gate: Outputs 0 only when all inputs are 1\nTruth table: !(0&0)=1, !(0&1)=1, !(1&0)=1, !(1&1)=0',
      'NOR': 'NOR gate: Outputs 0 when any input is 1\nTruth table: !(0|0)=1, !(0|1)=0, !(1|0)=0, !(1|1)=0',
      'XOR': 'XOR gate: Outputs 1 when odd number of inputs are 1\nTruth table: 0^0=0, 0^1=1, 1^0=1, 1^1=0',
      'XNOR': 'XNOR gate: Outputs 1 when even number of inputs are 1\nTruth table: !(0^0)=1, !(0^1)=0, !(1^0)=0, !(1^1)=1',
      'BUFF': 'Buffer gate: Passes input to output unchanged\nTruth table: BUFF(0)=0, BUFF(1)=1',
      'BUF': 'Buffer gate: Passes input to output unchanged\nTruth table: BUF(0)=0, BUF(1)=1',
      'INPUT': 'INPUT declaration: Declares a primary input signal to the circuit',
      'OUTPUT': 'OUTPUT declaration: Declares a primary output signal from the circuit',
    };
    
    const description = gateDescriptions[word.word.toUpperCase()];
    if (description) {
      return {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        },
        contents: [
          { value: `**${word.word.toUpperCase()}**` },
          { value: description },
        ],
      };
    }
    
    return null;
  },
});