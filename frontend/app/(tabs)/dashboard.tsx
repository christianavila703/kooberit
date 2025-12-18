import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { statusBarHeight } from "@/constants/resources";
import { IRootState } from "@/store/index";
import { toggleMode } from "@/store/slices/authSlice";
import { IconSymbol } from "@/components/ui/icon-symbol";

import ContractorDashboard from "@/components/dashboard/Contractor";
import HomeownerDashboard from "@/components/dashboard/Homeowner";


export default function DashboardScreen() {
    const dispatch = useAppDispatch();
    const { user, mode } = useAppSelector((state: IRootState) => state.auth);
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const isDark = colorScheme === 'dark';
    const isContractor = user?.role === 'contractor';
    const showToggle = isContractor;

    const handleToggle = () => {
        dispatch(toggleMode());
    };

    // Determine which dashboard to show based on mode
    const showContractorDashboard = isContractor && mode === 'contractor';

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <View>
                    <Text style={[styles.greeting, { color: colors.icon }]}>Welcome back,</Text>
                    <Text style={[styles.name, { color: colors.text }]}>
                        {user?.firstName} {user?.lastName}
                    </Text>
                </View>

                {showToggle && (
                    <TouchableOpacity
                        style={[styles.toggleButton, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}
                        onPress={handleToggle}
                        activeOpacity={0.7}>
                        <IconSymbol 
                            name={mode === 'contractor' ? 'person.2.fill' : 'person.fill'} 
                            size={20} 
                            color={colors.tint} 
                        />
                        <Text style={[styles.toggleText, { color: colors.text }]}>
                            {mode === 'contractor' ? 'Contractor' : 'Homeowner'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {showContractorDashboard ? <ContractorDashboard /> : <HomeownerDashboard />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: statusBarHeight,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 14,
        marginBottom: 4,
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
    },
});