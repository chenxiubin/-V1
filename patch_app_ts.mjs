import fs from 'fs';
let code = fs.readFileSync('server/app.ts', 'utf-8');

const fallback = `
// Fallback for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    code: 'API_ROUTE_NOT_FOUND',
    message: \`接口不存在：\${req.method} \${req.path}\`,
    retryable: false
  });
});
`;

code = code.replace(
  "app.use('/api/ai', scenePlannerRouter);",
  "app.use('/api/ai', scenePlannerRouter);" + fallback
);

fs.writeFileSync('server/app.ts', code);
