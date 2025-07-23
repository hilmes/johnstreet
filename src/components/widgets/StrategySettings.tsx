import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Strategy } from '../../types/strategy';
import StrategyConfig from './StrategyConfig';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`strategy-tabpanel-${index}`}
      aria-labelledby={`strategy-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface StrategySettingsProps {
  open: boolean;
  strategy: Strategy;
  onClose: () => void;
  onSave: (updatedStrategy: Strategy) => void;
}

const StrategySettings: React.FC<StrategySettingsProps> = ({
  open,
  strategy,
  onClose,
  onSave,
}) => {
  const [currentTab, setCurrentTab] = React.useState(0);
  const [editedStrategy, setEditedStrategy] = React.useState<Strategy>(strategy);

  React.useEffect(() => {
    setEditedStrategy(strategy);
  }, [strategy]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleSave = () => {
    onSave(editedStrategy);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: '#FFFFFF',
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
      }}>
        <Typography variant="h6">Strategy Settings</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{ px: 2 }}
          >
            <Tab label="General" />
            <Tab label="Risk Management" />
            <Tab label="Notifications" />
            <Tab label="Advanced" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          <TabPanel value={currentTab} index={0}>
            <StrategyConfig
              strategy={editedStrategy}
              isEditing={true}
              onUpdate={(updatedStrategy) => setEditedStrategy(updatedStrategy)}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {/* Risk Management settings will go here */}
            <Typography variant="body1" color="textSecondary">
              Risk management settings coming soon...
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            {/* Notification settings will go here */}
            <Typography variant="body1" color="textSecondary">
              Notification settings coming soon...
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            {/* Advanced settings will go here */}
            <Typography variant="body1" color="textSecondary">
              Advanced settings coming soon...
            </Typography>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StrategySettings; 