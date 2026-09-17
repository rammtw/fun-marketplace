// jest-dom добавляет матчеры вида toBeInTheDocument().
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

// jsdom из jest 27 (его версию задаёт react-scripts) не даёт TextEncoder,
// а react-router 7 читает его при загрузке модуля.
if (typeof global.TextEncoder === 'undefined') {
  Object.assign(global, { TextEncoder, TextDecoder });
}
