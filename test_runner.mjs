import { exec } from 'child_process';
exec('npm run lint', (err, stdout, stderr) => {
  console.log(stdout);
  console.log(stderr);
});
