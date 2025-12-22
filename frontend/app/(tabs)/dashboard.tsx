import { View, Text, StyleSheet } from "react-native";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { statusBarHeight } from "@/constants/resources";
import { IRootState } from "@/store/index";
import { setMode } from "@/store/slices/authSlice";
import { TabSwitcher } from "@/components/ui/tab-switcher";

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

    const handleModeChange = (newMode: 'contractor' | 'homeowner') => {
        dispatch(setMode(newMode));
    };

    // Determine which dashboard to show based on mode
    const showContractorDashboard = isContractor && mode === 'contractor';

    // Format name: if full name > 14 chars, show only first name (max 14 chars)
    const formatName = () => {
        if (!user?.firstName) return '';
        const fullName = `${user.firstName} ${user.lastName || ''}`.trim();
        if (fullName.length > 14) {
            return user.firstName.length > 14 
                ? user.firstName.substring(0, 14) 
                : user.firstName;
        }
        return fullName;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <View>
                    <Text style={[styles.greeting, { color: colors.icon }]}>Welcome back,</Text>
                    <Text style={[styles.name, { color: colors.text }]}>
                        {formatName()}
                    </Text>
                </View>

                {showToggle && (
                    <TabSwitcher
                        value={mode}
                        onValueChange={handleModeChange}
                        colors={colors}
                        isDark={isDark}
                    />
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
});