# Internal functions

- `getPrivateWorkspace`: signed-in user's owned farms, entries, stock items and movements.
- `savePrivateEntry`: validated create/edit, restricted to an active owned farm.
- `archivePrivateEntry`: archive or restore an owned entry.
- `createInventoryItem`: create an item on an active owned farm.
- `recordStockMovement`: append movement; database enforces stock integrity.
- `getPlatformOverview`: authorized platform counts and recent immutable audit entries.
- `getProblemAdvice`: owner-check, validated crop/livestock description, compact context, safe AI advice.

Cloud Auth provides email signup, password sign-in, confirmation and reset. Recovery does not require an old password; normal signed-in password changes collect it.