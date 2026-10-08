import red from '@material-ui/core/colors/red';
import deepOrange from '@material-ui/core/colors/deepOrange';
import { createTheme } from '@material-ui/core/styles';
import { dark } from '@material-ui/core/styles/createPalette';
import { blue, green } from '@material-ui/core/colors';

// A custom theme for this app
const theme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: deepOrange[400],
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
    
    red: red[700],
    blue: blue[700],
    green: green[700],

  },
});
export default theme;
