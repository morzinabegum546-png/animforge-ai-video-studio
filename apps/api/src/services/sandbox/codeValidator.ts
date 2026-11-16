import ts from 'typescript';
import { CodeValidationResult } from '@animforge/shared';

const ALLOWED_MODULES = new Set([
  'react',
  'remotion',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
]);

const FORBIDDEN_IDENTIFIERS = new Set([
  'eval',
  'Function',
  'require',
  'process',
  'global',
  'globalThis',
  'child_process',
  'fs',
  'net',
  'http',
  'https',
  'dgram',
  'vm',
  'worker_threads',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
]);

export function validateAnimationCode(sourceCode: string): CodeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!sourceCode.trim()) {
    return { valid: false, errors: ['Animation code is empty.'], warnings };
  }

  const sourceFile = ts.createSourceFile(
    'SceneComponent.tsx',
    sourceCode,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX
  );

  let hasDefaultExport = false;

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const mod = node.moduleSpecifier.text;
      if (!ALLOWED_MODULES.has(mod)) {
        errors.push(`Disallowed import "${mod}". Allowed: ${Array.from(ALLOWED_MODULES).join(', ')}`);
      }
    }

    if (ts.isExportAssignment(node) || (ts.isFunctionDeclaration(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))) {
      hasDefaultExport = true;
    }
    if (ts.isVariableStatement(node)) {
      // check export default later via text fallback if needed
    }

    if (ts.isCallExpression(node)) {
      const exprText = node.expression.getText(sourceFile);
      if (exprText === 'eval' || exprText === 'Function' || exprText === 'require' || exprText === 'import') {
        errors.push(`Forbidden dynamic call "${exprText}()".`);
      }
    }

    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
      const parent = node.parent;
      // Ignore property names like obj.process unless it's a standalone identifier reference
      if (!ts.isPropertyAccessExpression(parent) || parent.expression === node) {
        errors.push(`Forbidden global or Node identifier "${node.text}".`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!hasDefaultExport && !/export\s+default\s+/.test(sourceCode)) {
    warnings.push('Scene component should export a default React component (`export default ...`).');
  }

  // Transpile check with TypeScript compiler
  const transpile = ts.transpileModule(sourceCode, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    reportDiagnostics: true,
  });

  if (transpile.diagnostics && transpile.diagnostics.length > 0) {
    for (const diag of transpile.diagnostics) {
      const msg = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
      errors.push(`Syntax/TSX error: ${msg}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
