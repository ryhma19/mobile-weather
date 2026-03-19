import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'

type MapScreenProps = {
	// Callback, jolla palataan Overview näkymään.
	onGoBack?: () => void
}

export default function MapScreen({ onGoBack }: MapScreenProps) {
	return (
		<View style={styles.container}>
			{/* Vasemmassa ylänurkassa nuoli josta palataan pääsivulle. */}
			<Pressable style={styles.backButton} onPress={onGoBack}>
				<Text style={styles.backButtonText}>←</Text>
			</Pressable>
			<Text style={styles.text}>Map here</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.background,
	},
	backButton: {
		position: 'absolute',
		top: 16,
		left: 16,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 10,
		backgroundColor: colors.surfaceVariant,
		borderWidth: 1,
		borderColor: colors.outline,
	},
	backButtonText: {
		color: colors.textPrimary,
		fontSize: 24,
		fontWeight: '700',
		lineHeight: 28,
	},
	text: {
		color: colors.textPrimary,
		fontSize: 22,
		fontWeight: '700',
	},
})
