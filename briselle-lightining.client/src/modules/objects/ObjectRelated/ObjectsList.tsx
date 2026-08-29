import Templist from './templist';

/**
 * Objects menu now reuses the master template baseline module.
 * This keeps one source of truth for loader behavior and layout.
 */
export default function ObjectsList() {
    return <Templist />;
}
