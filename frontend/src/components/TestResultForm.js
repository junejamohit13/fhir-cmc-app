const organizeTestsAndTimepoints = (protocolData, sharedTests) => {
  console.log("*** MODIFIED VERSION - CHANGES SHOULD BE VISIBLE ***");
  const tests = [];
  const timepointsList = [];
  // ... existing code ...
} 

function TestResultForm({ isEdit = false, initialData = null }) {
  // ... existing code ...
  
  // At the very top of the return statement
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          {isEdit ? 'Edit Test Result' : 'Record Test Result'}
        </Typography>
        
        <div style={{ 
          backgroundColor: 'red', 
          color: 'white', 
          padding: '20px', 
          marginBottom: '20px', 
          fontSize: '24px', 
          textAlign: 'center',
          border: '5px solid black'
        }}>
          UPDATED UI - {new Date().toLocaleTimeString()}
        </div>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        // ... existing code ...
      </CardContent>
    </Card>
  );
} 